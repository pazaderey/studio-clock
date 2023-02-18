import express from "express";
import { readFileSync } from "fs";
import OBSWebSocket from "obs-websocket-js";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";

async function initOBS(ip, port, password) {
  try {
    obs.connect(`ws://${ip}:${port}`, password).then(() => {
      console.log("Connected to OBS");
      regEvents();
    });
  } catch (e) {
    console.error(e);
    io.emit("my response", { type: "error", mes: 'error OBS connection' });
  }
}

function regEvents() {
  obs.on("StreamStateChanged", (args) => {
    switch (args.outputState) {
      case "OBS_WEBSOCKET_OUTPUT_STARTED":
        stream = true;
        io.emit("my response", { type: 'stream', event: 'start', stream });
        break;
      case "OBS_WEBSOCKET_OUTPUT_STOPPED":
        stream = false;
        io.emit("my response", { type: 'stream', event: 'stop', stream });
        break;
    }
  });

  obs.on("RecordStateChanged", (args) => {
    switch (args.outputState) {
      case "OBS_WEBSOCKET_OUTPUT_STARTED":
        io.emit("my response", { type: 'record', event: 'start', stream });
        break;
      case "OBS_WEBSOCKET_OUTPUT_STOPPED":
        io.emit("my response", { type: 'record', event: 'stop', stream });
        break;
      case "OBS_WEBSOCKET_OUTPUT_PAUSED":
        io.emit("my response", { type: 'record', event: 'paused', stream });
    }
  });

  obs.on("MediaInputPlaybackStarted", (args) => {
    io.emit("media response", { type: "media", event: "start", sourceName: args.inputName });
  });

  obs.on("MediaInputPlaybackEnded", (args) => {
    io.emit("media response", { type: "media", event: "stop" });
  });

  obs.on("MediaInputActionTriggered", (args) => {
    stream = false;
    switch (args.mediaAction) {
      case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
        io.emit("media response", { type: "media", event: "paused" });
        break;
    }
  });
}

const app = express();
const port = 4000;
app.use(express.json());
app.use(cors());
const { obs: obsConfig } = JSON.parse(readFileSync("config.json"));
const obs = new OBSWebSocket();
initOBS(obsConfig.ip, obsConfig.port, obsConfig.password);
let stream = false;
let block = "stop";
const server = createServer(app);
const io = new Server(server, {
  cors: "http://localhost:3000"
});

io.on("connection", async (socket) => {

  socket.on("block_event", (data) => {
    block = data.event;
    socket.emit("block_response", { event: data.event, info: data.info });
  });

  socket.on("record info", async () => {
    const recordStatus = await obs.call("GetRecordStatus");
    socket.emit("my response", { type: "return", time: recordStatus.outputTimecode });
  });
  
  socket.on("media info", async (data) => {
    const mediaStatus = await obs.call("GetMediaInputStatus", { inputName: data.sourceName });
    socket.emit("media response", { type: 'media', event: 'duration', duration: mediaStatus.mediaDuration, time: mediaStatus.mediaCursor });
  });

  console.log("Connected to front");
  let streamTime = "";
  let recordTime = "";
  try {
    const streamStatus = await obs.call("GetStreamStatus");
    const recordStatus = await obs.call("GetRecordStatus");
    if (streamStatus.outputActive) {
      streamTime = streamStatus.outputTimecode;
    }

    if (recordStatus.outputActive) {
      recordTime = recordStatus.outputTimecode;
    }

    io.emit("my response", { type: 'connect', stream: stream.outputActive, recording: recordStatus.outputActive, recordPause: recordStatus.outputPaused, streamTime, recordTime });
    const { inputs } = await obs.call("GetMedia");
    if (inputs?.length) {
      const mediaStatus = await obs.call("GetMediaInputStatus", { inputName: inputs[0].inputName });
      if (["OBS_MEDIA_STATE_PAUSED", "OBS_MEDIA_STATE_PLAYING"].includes(mediaStatus.mediaState)) {
        const duration = mediaStatus.mediaDuration;
        const time = mediaStatus.mediaCursor;
        io.emit("my response", { type: 'media', event: 'connect', state: mediaStatus.mediaState, time, duration });
      }
    }
    io.emit("block response", { event: block });
  } catch (e) {
    io.emit("my response", { type: 'connect', error: true });
  }
});

app.post("/reconnect", (req, res) => {
  const body = req.body;
  if (body) {
    const ip = body.ip;
    const port = body.port;
    const password = body.password;
    if (obs) {
      obs.disconnect();
    }
    initOBS(ip, port, password);
    return res.send({ status: "ok" });
  }
  return res.send({ status: "error", description: "Failed to connect to OBS. Wait some time, or check the correctness of your records" });
});

server.listen(port, () => console.log(`Server started on port ${port}`));
