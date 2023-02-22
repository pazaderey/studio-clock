import OBSWebSocket from "obs-websocket-js";

export class OBSService {
  constructor(config) {
    this.config = config;
    this.obs = false;
    this.stream = false;
    this.block = "stop";
  }

  async init(config = this.config) {
    try {
      this.obs = new OBSWebSocket();
      await this.obs.connect(`ws://${config.ip}:${config.port}`, config.password);
      console.log("Connected to OBS");
    } catch(e) {
      this.obs = false;
      console.log("Connection to OBS failed");
    }
  }

  async getRecordStatus() {
    return this.obs.call("GetRecordStatus");
  }

  async getMediaInputStatus(inputName) {
    return this.obs.call("GetMediaInputStatus", { inputName });
  }

  async getStreamStatus() {
    return this.obs.call("GetStreamStatus");
  }

  async getInputList() {
    return this.obs.call("GetInputList");
  }

  registerEvents(io) {
    this.obs.on("StreamStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          this.stream = true;
          io.emit("my response", { type: 'stream', event: 'start', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          this.stream = false;
          io.emit("my response", { type: 'stream', event: 'stop', stream: this.stream });
          break;
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          io.emit("my response", { type: 'record', event: 'start', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          io.emit("my response", { type: 'record', event: 'stop', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_PAUSED":
          io.emit("my response", { type: 'record', event: 'paused', stream: this.stream });
      }
    });

    this.obs.on("MediaInputPlaybackStarted", (args) => {
      io.emit("media response", { type: "media", event: "start", sourceName: args.inputName });
    });

    this.obs.on("MediaInputPlaybackEnded", (args) => {
      io.emit("media response", { type: "media", event: "stop" });
    });

    this.obs.on("MediaInputActionTriggered", (args) => {
      this.stream = false;
      switch (args.mediaAction) {
        case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
          io.emit("media response", { type: "media", event: "paused" });
          break;
      }
    });
  }
}