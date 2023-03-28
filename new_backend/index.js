import express from "express";
import { readFileSync } from "fs";
import cors from "cors";
import { getLogger } from "./logger.js";
import { Server } from "socket.io";
import { createServer } from "http";
import { OBSService } from "./obs.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const env = process.env;
const logger = getLogger();

function debugEvent(name, data) {
  logger.debug(`Emitted "${name}" with data: ${JSON.stringify(data)}`);
}

/**
 * @param {OBSService} obsService 
 */
function startServer(obsService) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  const server = createServer(app);
  const FRONT_URL = env.FRONTEND_URL || "http://localhost";
  const FRONT_PORT = env.FRONTEND_PORT || 3000;
  const io = new Server(server, {
    cors: `${FRONT_URL}:${FRONT_PORT}`
  });
  logger.debug("Started IO");
  obsService.registerEvents(io);

  app.post("/reconnect", async ({ body }, res) => {
    logger.debug(`Got reconnect with body: ${JSON.stringify(body)}`);

    await obsService.connect(...Object.values(body));
    if (obsService.connected) {
      io.emit("my response", { type: "connect" });
      return res.send({ status: "ok" });
    }
    io.emit("obs_failed", { type: 'connect', error: true });
    return res.status(400).send({ status: "error", description: "Не удалось подключиться к OBS. Удостоверьтесь в правильности данных." });
  });

  app.post("/message", async ({ body }, res) => {
    logger.debug(`Got message with body ${JSON.stringify(body)}`);
    try {
      const message = body.message.toString();
      if (message.length < 26) {
        obsService.hint = message;
        io.emit("director hint", { message });
        return res.send({ status: "ok" });
      }
      return res.status(400).send({ status: "error", description: "Сообщение слишком длинное (больше 26 символов)." });
    } catch (e) {
      return res.status(400).send({ status: "error", description: "Сообщение нельзя преобразовать к тексту." });
    }
  });

  app.post("/block/:event", (req, res) => {
    const event = req.params.event;
    logger.debug(`Got block with ${event}`);
    if (["start", "pause", "stop"].includes(event)) {
      io.emit("block change", { event });
      res.send({ status: "ok" });
    } else {
      return res.status(400).send({ status: "error", description: "Такого события нет, вот список доступных: start, pause, stop" });
    }
  });

  io.on("connection", async (socket) => {
    logger.info("Connected to front");
    if (!obsService.connected) {
      socket.emit("obs_failed", { type: 'connect', error: true });
      return;
    }
    let streamTime = "";
    let recordTime = "";

    socket.on("media info", async (data) => {
      const mediaStatus = await obsService.getMediaInputStatus(data);
      const eventData = {
        type: 'media',
        event: 'duration',
        duration: mediaStatus.mediaDuration,
        time: mediaStatus.mediaCursor,
        sourceName: data
      };
      socket.emit("media response", eventData);
    });

    socket.on("input list", async () => {
      const { inputs } = await obsService.getInputList();
      socket.emit("input list", { inputs });
    });

    socket.on("audio change", async (data) => {
      const { inputMuted } = await obsService.getInputMute(data);
      const eventData = { input: data, inputMuted }
      io.emit("audio change", eventData);
    });

    const streamStatus = await obsService.getStreamStatus();
    const recordStatus = await obsService.getRecordStatus();
    if (streamStatus.outputActive) {
      streamTime = streamStatus.outputTimecode;
    }

    if (recordStatus.outputActive) {
      recordTime = recordStatus.outputTimecode;
    }

    socket.emit("obs state", {
      type: 'connect',
      stream: streamStatus.outputActive,
      recording: recordStatus.outputActive,
      recordPause: recordStatus.outputPaused,
      streamTime,
      recordTime
    });

    socket.emit("director hint", { message: obsService.hint });

    const inputs = await obsService.getInputList();
    socket.emit("input list", { inputs });
    if (inputs?.length) {
      let mediaInput;
      for (const input of inputs) {
        const tempStatus = await obsService.getMediaInputStatus(input.inputName);
        if (["OBS_MEDIA_STATE_PAUSED", "OBS_MEDIA_STATE_PLAYING"].includes(tempStatus.mediaState)) {
          mediaInput = input.inputName;
          break;
        }
      }
      if (!mediaInput) {
        return;
      }
      const mediaStatus = await obsService.getMediaInputStatus(mediaInput);
      const duration = mediaStatus.mediaDuration;
      const time = mediaStatus.mediaCursor;
      socket.emit("media response", {
        type: 'media',
        event: 'connect',
        state: mediaStatus.mediaState,
        time,
        duration
      });
      debugEvent("media response", {
        type: 'media',
        event: 'connect',
        state: mediaStatus.mediaState,
        time,
        duration
      });
    }
  });

  const PORT = env.BACKEND_PORT || 4000;
  server.listen(PORT, () => {
    logger.info(`Server started on port ${PORT}`);
    logger.debug("Logs containing Unicode characters may display incorrect");
  });
}

(async function main() {
  let obsConfig;
  try {
    obsConfig = JSON.parse(readFileSync("config.json")).obs;
  } catch (e) {
    obsConfig = { ip: "", port: 0, password: "" };
  }
  const obsService = new OBSService();
  await obsService.connect(...Object.values(obsConfig));
  startServer(obsService);
})().catch(e => console.log(e));

