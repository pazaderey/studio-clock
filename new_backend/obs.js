import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";
import { getLogger } from "./logger.js";

const logger = getLogger();

function debugOBSEvent(name, data) {
  logger.debug(`Got "${name}" with data: ${JSON.stringify(data)}`);
}

export class OBSService {
  /**
   * @param {{
   *   ip: string
   *   port: number
   *   password?: string
   * }} config 
   */
  constructor(config) {
    this.config = config;
    this.obs = false;
    this.stream = false;
    this.block = 'stop';
  }

  async init(config = this.config) {
    try {
      this.obs = new OBSWebSocket();
      await this.obs.connect(`ws://${config.ip}:${config.port}`, config.password);
      logger.info("Connected to new OBS");
    } catch(e) {
      this.obs = false;
      logger.error("Connection to OBS failed");
    }
  }

  async disconnect() {
    if (this.obs) {
      await this.obs.disconnect();
      this.obs = false;
    }
  }

  async reconnect(config = this.config) {
    await this.disconnect();
    await this.init(config);
  }

  /**
   * @returns {Promise<{
   *   outputActive: boolean
   *   outputPaused: boolean
   *   outputTimecode: string
   *   outputDuration: number
   *   outputBytes: number
   * }>}
   */
  async getRecordStatus() {
    return this.obs.call("GetRecordStatus");
  }
  
  /**
   * @param {string} inputName 
   * @returns {Promise<{
   *   mediaDuration: number
   *   mediaCursor: number
   *   inputState: string
   * }>}
   */
  async getMediaInputStatus(inputName) {
    return this.obs.call("GetMediaInputStatus", { inputName });
  }

  /**
   * @returns {Promise<{
   *   outputActive: boolean
   *   outputReconnecting: boolean
   *   outputTimecode: string
   *   outputDuration: number
   *   outputCongestion: number
   *   outputBytes: number
   *   outputSkippedFrames: number
   *   outputTotalFrames: number
   * }>}
   */
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

  /**
   * @param {string} inputName 
   * @returns {Promise<{
   *   inputMuted: boolean
   * }>}
   */
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
    if (!this.obs) {
      console.log("Cannot register events, OBS is not initialized");
      return;
    }

    this.obs.on("StreamStateChanged", (args) => {
      debugOBSEvent("StreamStateChanged", args);
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
      debugOBSEvent("RecordStateChanged", args);
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
      debugOBSEvent("MediaInputPlaybackStarted", args);
      io.emit("media response", { type: "media", event: "start", sourceName: args.inputName });
    });

    this.obs.on("MediaInputPlaybackEnded", (args) => {
      debugOBSEvent("MediaInputPlaybackEnded", args);
      io.emit("media response", { type: "media", event: "stop" });
    });

    this.obs.on("MediaInputActionTriggered", (args) => {
      debugOBSEvent("MediaInputActionTriggered", args);
      this.stream = false;
      switch (args.mediaAction) {
        case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
          io.emit("media response", { type: "media", event: "paused" });
          break;
      }
    });

    this.obs.on("InputMuteStateChanged", (args) => {
      debugOBSEvent("InputMuteStateChanged", args);
      io.emit("audio state", { input: args.inputName, state: !args.inputMuted});
    });

    this.obs.on("InputCreated", async () => {
      debugOBSEvent("InputCreated", {});
      const { inputs } = await this.getInputList();
      io.emit("input list", { inputs });
    });

    this.obs.on("InputRemoved", async () => {
      debugOBSEvent("InputRemoved", {});
      const { inputs } = await this.getInputList();
      io.emit("input list", { inputs });
    });
  }
}