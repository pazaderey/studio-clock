import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { readFileSync } from "fs";
import { createServer } from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";

import { getLogger } from "./logger.js";
import { OBSService, VMixService } from "./services/index.js";
import { EVENTS, INPUT_EVENTS, RESPONSE_STATUSES } from "./types/index.js";

dotenv.config({ path: ".env" });

const env = process.env;
const logger = getLogger();
const swaggerDocument = yaml.load(readFileSync("./api/openapi.yaml", "utf8"));
const config = JSON.parse(readFileSync("config.json"));
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
  logger.debug("If you can see this, you are in the debug mode!");

  const obsService = new OBSService(io, logger);
  const vmixService = new VMixService(io, logger);
  let mixer = obsService;
  let hint = "Подсказка";
  obsService.connect(...Object.values(config.obs));

  app.use("/api", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.post("/reconnect/:mixer", async (req, res) => {
    const mixerName = req.params.mixer;
    const mixers = ["obs", "vmix"];

    if (!mixers.includes(mixerName)) {
      return res.status(404).send({
        status: RESPONSE_STATUSES.Error,
        description: `Такого микшера нет, вот список доступных: ${mixers.join(", ")}`
      });
    }

    logger.debug(`Got reconnect to ${mixerName} with body:`, req.body);

    await mixer.disconnect();
    mixer = mixerName === "obs" ? obsService : vmixService;
    await mixer.connect(...Object.values(req.body));
    if (mixer.connected) {
      io.emit(EVENTS.Connected);
      return res.send({ status: RESPONSE_STATUSES.Ok });
    }

    io.emit(EVENTS.Failed);
    return res.status(422).send({
      status: RESPONSE_STATUSES.Error,
      description: `Не удалось подключиться к ${mixerName}. Удостоверьтесь в правильности данных.`
    });
  });

  app.post("/message", async ({ body }, res) => {
    logger.debug(`Got message with body ${JSON.stringify(body)}`);

    try {
      const message = body.message.toString();
      if (message.length < 26) {
        hint = message;
        io.emit(EVENTS.Hint, { message: hint });
        return res.send({ status: RESPONSE_STATUSES.Ok });
      }

      return res.status(422).send({
        status: RESPONSE_STATUSES.Error,
        description: "Сообщение слишком длинное (больше 26 символов)."
      });
    } catch (e) {
      return res.status(415).send({
        status: RESPONSE_STATUSES.Error,
        description: "Сообщение нельзя преобразовать к тексту."
      });
    }
  });

  app.post("/block/:event", (req, res) => {
    const event = req.params.event;
    logger.debug(`Got block with ${event}`);

    const operations = ["start", "pause", "stop"];
    if (operations.includes(event)) {
      io.emit(EVENTS.Block, { event });
      res.send({ status: RESPONSE_STATUSES.Ok });
    } else {
      return res.status(404).send({
        status: RESPONSE_STATUSES.Error,
        description: `Такого события нет, вот список доступных: ${operations.join(", ")}`
      });
    }
  });

  io.on("connection", async (socket) => {
    logger.info("Connected to front");

    if (!mixer.connected) {
      socket.emit(EVENTS.Failed);
      return;
    }

    socket.on(EVENTS.Hint, () => {
      socket.emit(EVENTS.Hint, { message: hint });
      logger.debug("Emitted hint: ", hint);
    });

    socket.on(EVENTS.MediaInfo, async (data) => {
      const mediaStatus = await mixer.getMediaInputStatus(data);
      if (mediaStatus.mediaCursor < 0 || mediaStatus.mediaDuration < 0) {
        return;
      }
      const eventData = {
        event: INPUT_EVENTS.Duration,
        duration: mediaStatus.mediaDuration,
        time: mediaStatus.mediaCursor,
        sourceName: data
      };

      socket.emit(EVENTS.MediaResponse, eventData);
    });

    socket.on(EVENTS.InputList, async () => {
      const inputs = await mixer.getInputList();
      logger.debug("Emitted inputs: ", inputs);
      socket.emit(EVENTS.InputList, { inputs });
    });

    socket.on(EVENTS.AudioChange, async (data) => {
      const { inputMuted } = await mixer.getInputMute(data);
      const eventData = { input: data, inputMuted };
      io.emit(EVENTS.AudioChange, eventData);
    });

    socket.on(EVENTS.Priority, (data) => {
      mixer.priority = data.event;
      io.emit(EVENTS.Priority, data);
    });
  });

  server.listen(BACK_PORT, () => {
    logger.info(`Server started on port ${BACK_PORT}`);
  });
}

main().catch(e => logger.error(e));
