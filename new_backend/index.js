import express from "express";
import { readFileSync } from "fs";
import OBSWebSocket from "obs-websocket-js";

const app = express();
const port = 4000;
app.use(express.json());
const { obs: obsConfig } = JSON.parse(readFileSync("config.json"));
const obs = new OBSWebSocket();
initOBS(obsConfig.ip, obsConfig.port, obsConfig.password);
let stream = false;
let block = "stop";

function initOBS(ip, port, password) {
  try {
    obs.connect(`ws://${ip}:${port}`, password);
    console.log("Connected to OBS");
    regEvents();
  } catch (e) {
    console.error(e);
    app.emit("my response", JSON.stringify({ type: "error", mes: 'error OBS connection' }));
  }
}

function regEvents() {
  obs.on("StreamStateChanged", (args) => {
    switch (args.outputState) {
      case "OBS_WEBSOCKET_OUTPUT_STARTED":
        stream = true;
        console.log("Stream started");
        app.emit("my response", JSON.stringify({ type: 'stream', event: 'start', stream }));
        break;
      case "OBS_WEBSOCKET_OUTPUT_STOPPED":
        stream = false;
        console.log("Stream stopped");
        app.emit("my response", JSON.stringify({ type: 'stream', event: 'stop', stream }));
        break;
    }
  });

  obs.on("RecordStateChanged", (args) => {
    switch (args.outputState) {
      case "OBS_WEBSOCKET_OUTPUT_STARTED":
        console.log("Recording started");
        app.emit("my response", JSON.stringify({ type: 'record', event: 'start', stream }));
        break;
      case "OBS_WEBSOCKET_OUTPUT_STOPPED":
        console.log("Recording stopped");
        app.emit("my response", JSON.stringify({ type: 'record', event: 'stop', stream }));
        break;
      case "OBS_WEBSOCKET_OUTPUT_PAUSED":
        console.log("Recording paused");
        app.emit("my response", JSON.stringify({ type: 'record', event: 'paused', stream }));
    }
  });

  obs.on("MediaInputPlaybackStarted", (args) => {
    console.log("Media started");
    app.emit("media response", JSON.stringify({ type: "media", event: "start", sourceName: args.inputName }));
  });

  obs.on("MediaInputPlaybackEnded", (args) => {
    console.log("Media stopped");
    app.emit("media response", JSON.stringify({ type: "media", event: "stop" }));
  });

  obs.on("MediaInputActionTriggered", (args) => {
    stream = false;
    switch (args.mediaAction) {
      case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
        console.log("Media paused");
        app.emit("media response", JSON.stringify({ type: "media", event: "paused" }));
        break;
    }
  });
}

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
    return JSON.stringify({ status: "ok" });
  }
  return JSON.stringify({ status: "error", description: "Failed to connect to OBS. Wait some time, or check the correctness of your records" });
});

app.on("record info", async () => {
  const recordStatus = await obs.call("GetRecordStatus");
  app.emit("my response", JSON.stringify({ type: "return", time: recordStatus.outputTimecode }));
});

app.on("media info", async (data) => {
  const mediaStatus = await obs.call("GetMediaInputStatus", { inputName: data.sourceName });
  app.emit("media response", JSON.stringify({ type: 'media', event: 'duration', duration: mediaStatus.mediaDuration, time: mediaStatus.mediaCursor }));
});

app.on("block event", (data) => {
  block = data.event;
  app.emit("block response", JSON.stringify({ event: data.event, info: data.info }));
});

app.on("connect", async () => {
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

    app.emit("my response", JSON.stringify({ type: 'connect', stream: stream.outputActive, recording: recordStatus.outputActive, recordPause: recordStatus.ouputPaused, streamTime, recordTime }));
    const { inputs } = await obs.call("GetMedia");
    if (inputs?.length) {
      const mediaStatus = await obs.call("GetMediaInputStatus", { inputName: inputs[0].inputName });
      if (["OBS_MEDIA_STATE_PAUSED", "OBS_MEDIA_STATE_PLAYING"].includes(mediaStatus.mediaState)) {
        const duration = mediaStatus.mediaDuration;
        const time = mediaStatus.mediaCursor;
        app.emit("my response", JSON.stringify({ type: 'media', event: 'connect', state: mediaStatus.mediaState, time, duration }));
      }
    }
  } catch (e) {
    app.emit("my response", JSON.stringify({ type: 'connect', error: true }));
  }

});

app.listen(port);
