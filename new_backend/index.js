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

  io.on("connection", async (socket) => {
    logger.info("Connected to front");
    if (!obsService.obs) {
      socket.emit("obs_failed", { type: 'connect', error: true });
      debugEvent("obs_failed", { type: 'connect', error: true });
      return;
    }
    let streamTime = "";
    let recordTime = "";

    app.post("/reconnect", async (req, res) => {
      logger.debug(`Got reconnect with body: ${JSON.stringify(req.body)}`);
      await obsService.reconnect(req.body);
      if (obsService.obs) {
        obsService.registerEvents(io);
        io.emit("my response", { type: "connect" });
        return res.send({ status: "ok" });
      }
      return res.send({ status: "error", description: "Не удалось подключиться к OBS. Удостоверьтесь в правильности данных." });
    });
  
    app.post("/message", async ({ body }, res) => {
      logger.debug(`Got message with body ${JSON.stringify(body)}`);
      try {
        const message = body.message.toString();
        if (message && message.length < 33) {
          obsService.hint = message;
          io.emit("director hint", { message });
          return res.send({ status: "ok" });
        }
        return res.send({status: "error", description: "Сообщение слишком длинное (больше 33 символов)."})
      } catch(e) {
        return res.send({status: "error", description: "Сообщение нельзя преобразовать к тексту."});
      }
    });

    socket.on("record info", async () => {
      const recordStatus = await obsService.getRecordStatus();
      const data = { type: "return", time: recordStatus.outputTimecode };
      socket.emit("my response", data);
      debugEvent("my response", data);
    });

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
      debugEvent("media response", eventData);
    });

    socket.on("input list", async () => {
      const { inputs } = await obsService.getInputList();
      socket.emit("input list", { inputs });
      debugEvent("input list", inputs);
    });

    socket.on('check input', async (data) => {
      const { inputMuted } = await obsService.getInputMute(data);
      const eventData = { input: data, state: !inputMuted }
      socket.emit("audio state", eventData);
      debugEvent("audio state", eventData);
    });

    socket.on("block check", () => {
      socket.emit("block status", { event: obsService.block });
      debugEvent("block status", { event: obsService.block });
    });

    socket.on("block changed", ({ event }) => {
      obsService.block = event;
      io.emit("block status", { event });
      debugEvent("block status", { event });
    });  

    const streamStatus = await obsService.getStreamStatus();
    const recordStatus = await obsService.getRecordStatus();
    if (streamStatus.outputActive) {
      streamTime = streamStatus.outputTimecode;
    }

    if (recordStatus.outputActive) {
      recordTime = recordStatus.outputTimecode;
    }

    socket.emit("my response", {
      type: 'connect',
      stream: streamStatus.outputActive,
      recording: recordStatus.outputActive,
      recordPause: recordStatus.outputPaused,
      streamTime,
      recordTime
    });

    socket.emit("director hint", { message: obsService.hint });

    const { inputs } = await obsService.getInputList();
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
  } catch(e) {
    obsConfig = { ip: "", port: 0 };
  }
  const obsService = new OBSService(obsConfig);
  await obsService.init();
  startServer(obsService);
})().catch(e => logger.error(e));

