import express from "express";
import { readFileSync } from "fs";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import { OBSService } from "./obs.js";

dotenv.config({ path: "../.env" });
const env = process.env;

/**
 * @param {OBSService} obsService 
 */
function startServer(obsService) {
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.post("/reconnect", async (req, res) => {
    await obsService.reconnect(req.body);
    if (obsService.obs) {
      obsService.registerEvents(io);
      return res.send({ status: "ok" });
    }
    return res.send({ status: "error", description: "Failed to connect to OBS. Wait some time, or check the correctness of your records" });
  });

  const server = createServer(app);
  const FRONT_URL = env.FRONTEND_URL || "http://localhost";
  const FRONT_PORT = env.FRONTEND_PORT || 3000;
  const io = new Server(server, {
    cors: `${FRONT_URL}:${FRONT_PORT}`
  });

  io.on("connection", async (socket) => {

    socket.on("record info", async () => {
      const recordStatus = await obsService.getRecordStatus();
      socket.emit("my response", { type: "return", time: recordStatus.outputTimecode });
    });

    socket.on("media info", async (data) => {
      const mediaStatus = await obsService.getMediaInputStatus(data.sourceName);
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
    if (obsService.obs) {
      obsService.registerEvents(io);
      const streamStatus = await obsService.getStreamStatus();
      const recordStatus = await obsService.getRecordStatus();
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

      const { inputs } = await obsService.getInputList();
      if (inputs?.length) {
        const mediaStatus = await obsService.getMediaInputStatus(inputs[0].inputName);
        if (["OBS_MEDIA_STATE_PAUSED", "OBS_MEDIA_STATE_PLAYING"].includes(mediaStatus.mediaState)) {
          const duration = mediaStatus.mediaDuration;
          const time = mediaStatus.mediaCursor;
          io.emit("my response", { type: 'media', event: 'connect', state: mediaStatus.mediaState, time, duration });
        }
      }
    } else {
      io.emit("my response", { type: 'connect', error: true });
    }
  });

  const PORT = env.BACKEND_PORT || 4000;
  server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
}

(async function main() {
  const { obs: obsConfig } = JSON.parse(readFileSync("config.json"));
  const obsService = new OBSService(obsConfig);
  await obsService.init();
  startServer(obsService);
})().catch(e => console.log(e));

