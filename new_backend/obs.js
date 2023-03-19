import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";
import { getLogger } from "./logger.js";

const logger = getLogger();

function debugOBSEvent(name, data) {
  logger.debug(`Event "${name}" with data: ${JSON.stringify(data)}`);
}

export class OBSService {
  /**
   * @param {{
   *   ip: string
   *   port: number
   *   password?: string
   * }} config 
   */
  constructor() {
    this.config = {};
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.stream = false;
    this.block = 'stop';
    this.hint = "";
  }

  async connect(config) {
    await this.disconnect();
    try {
      await this.obs.connect(`ws://${config.ip}:${config.port}`, config.password);
      this.connected = true;
      this.config = Object.create(config);
      logger.info("Connected to new OBS");
    } catch(e) {
      this.connected = false;
      logger.error("Connection to OBS failed");
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
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

  /**
   * @returns {Promise<{
   *   inputs: {
   *     inputKind: string
   *     inputName: string
   *     unversionedInputKind: string
   *   }[]
   * }>}
   */
  async getInputList() {
    return this.obs.call("GetInputList");
  }

  async getInputMute(inputName) {
    try {
      const data = await this.obs.call("GetInputMute", { inputName });
      return data;
    } catch(e) {
      return { inputMuted: true };
    }
  }

  /**
   * @param {Server} io 
   */
  registerEvents(io) {
    this.obs.on("ConnectionClosed", (error) => {
      logger.info("OBS connection stopped");
      this.obs = false;
      io.emit("obs_failed", { type: 'connect', error: true });
    });

    this.obs.on("StreamStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          this.stream = true;
          io.emit("obs state", { type: 'stream', event: 'start', stream: this.stream });
          debugOBSEvent("my response", { type: 'stream', event: 'start', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          this.stream = false;
          io.emit("obs state", { type: 'stream', event: 'stop', stream: this.stream });
          debugOBSEvent("my response", { type: 'stream', event: 'stop', stream: this.stream });
          break;
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          io.emit("obs state", { type: 'record', event: 'start', stream: this.stream });
          debugOBSEvent("my response", { type: 'record', event: 'start', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          io.emit("obs state", { type: 'record', event: 'stop', stream: this.stream });
          debugOBSEvent("my response", { type: 'record', event: 'stop', stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_PAUSED":
          io.emit("obs state", { type: 'record', event: 'paused', stream: this.stream });
          debugOBSEvent("my response", { type: 'record', event: 'stop', stream: this.stream });
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

    this.obs.on("InputMuteStateChanged", (args) => {
      io.emit("audio state", { input: args.inputName, state: !args.inputMuted});
    });

    this.obs.on("InputCreated", async () => {
      const { inputs } = await this.getInputList();
      io.emit("input list", { inputs });
    });

    this.obs.on("InputRemoved", async () => {
      const { inputs } = await this.getInputList();
      io.emit("input list", { inputs });
    });
  }
}