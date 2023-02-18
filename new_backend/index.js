import express from "express";
import { readFileSync } from "fs";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import path from "path";
import { OBSService } from "./obs.js";

dotenv.config({ path: "../.env" });
const env = process.env;

function initServer(obsService) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.post("/reconnect", async (req, res) => {
    obsService.obs.disconnect();
    try {
      await obsService.init(req.body);
      return res.send({ status: "ok" });
    } catch (e) {
      return res.send({ status: "error", description: "Failed to connect to OBS. Wait some time, or check the correctness of your records" });
    }
  });

  const server = createServer(app);
  const FRONT_URL = env.FRONTEND_URL || "http://localhost";
  const FRONT_PORT = env.FRONTEND_PORT || 3000;
  const io = new Server(server, {
    cors: `${FRONT_URL}:${FRONT_PORT}`
  });

  io.on("connection", async (socket) => {
    socket.on("block_event", (data) => {
      obsService.block = data.event;
      socket.emit("block_response", { event: data.event, info: data.info });
    });

    socket.on("record info", async () => {
      const recordStatus = await obsService.obs.call("GetRecordStatus");
      socket.emit("my response", { type: "return", time: recordStatus.outputTimecode });
    });

    socket.on("media info", async (data) => {
      const mediaStatus = await obsService.obs.call("GetMediaInputStatus", { inputName: data.sourceName });
      socket.emit("media response", {
        type: 'media',
        event: 'duration',
        duration: mediaStatus.mediaDuration,
        time: mediaStatus.mediaCursor
      });
    });

    console.log("Connected to front");
    let streamTime = "";
    let recordTime = "";
    try {
      const streamStatus = await obsService.obs.call("GetStreamStatus");
      const recordStatus = await obsService.obs.call("GetRecordStatus");
      if (streamStatus.outputActive) {
        streamTime = streamStatus.outputTimecode;
      }

      if (recordStatus.outputActive) {
        recordTime = recordStatus.outputTimecode;
      }

      io.emit("my response", {
        type: 'connect',
        stream: streamStatus.outputActive,
        recording: recordStatus.outputActive,
        recordPause: recordStatus.outputPaused,
        streamTime, recordTime
      });

      const { inputs } = await obsService.obs.call("GetMedia");
      if (inputs?.length) {
        const mediaStatus = await obsService.obs.call("GetMediaInputStatus", { inputName: inputs[0].inputName });
        if (["OBS_MEDIA_STATE_PAUSED", "OBS_MEDIA_STATE_PLAYING"].includes(mediaStatus.mediaState)) {
          const duration = mediaStatus.mediaDuration;
          const time = mediaStatus.mediaCursor;
          io.emit("my response", { type: 'media', event: 'connect', state: mediaStatus.mediaState, time, duration });
        }
      }
      io.emit("block response", { event: obsService.block });
    } catch (e) {
      io.emit("my response", { type: 'connect', error: true });
    }
  });

  return [io, server];
}

function runServer(server) {
  const PORT = env.BACKEND_PORT || 4000;
  server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

(async function main() {
  const { obs: obsConfig } = JSON.parse(readFileSync("config.json"));
  const obsService = new OBSService(obsConfig);
  try {
    await obsService.init();
  } catch (e) {
    console.log("Connection to OBS failed");
  }
  const [io, server] = initServer(obsService);
  obsService.registerEvents(io);
  runServer(server);
})();

