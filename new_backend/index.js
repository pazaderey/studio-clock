import cors from "cors";
import { createServer } from "http";
import dotenv from "dotenv";
import express from "express";
import { getLogger } from "./logger.js";
import { OBSService } from "./obs.js";
import { readFileSync } from "fs";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml"

dotenv.config({ path: "../.env" });

const env = process.env;
const logger = getLogger();
const swaggerDocument = yaml.load(readFileSync("./api/openapi.yaml", "utf8"));
const obsConfig = JSON.parse(readFileSync("config.json")).obs;
const FRONT_URL = env.FRONTEND_URL || "http://localhost";
const FRONT_PORT = 80;
const BACK_PORT = 4000;

async function main() {
  const app = express();
  app.use(express.json());
  app.use(cors());

  const server = createServer(app);
  const io = new Server(server, {
    cors: `${FRONT_URL}:${FRONT_PORT}`
  });
  const obsService = new OBSService(io);
  await obsService.connect(...Object.values(obsConfig));

  app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.post("/reconnect", async ({ body }, res) => {
    logger.debug(`Got reconnect with body: ${JSON.stringify(body)}`);

    await obsService.connect(...Object.values(body));
    if (obsService.connected) {
      io.emit("obs connected", { type: "connect" });
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

    socket.on("obs priority", (data) => {
      obsService.priority = data.event;
      io.emit("obs priority", data);
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
      type: "connect",
      event: "connect",
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
    }
  });

  server.listen(BACK_PORT, () => {
    logger.info(`Server started on port ${BACK_PORT}`);
    logger.debug("Logs containing Unicode characters may display incorrect");
  });
}

main().catch(e => logger.error(e));
