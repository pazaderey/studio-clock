import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";
import { getLogger } from "./logger.js";

const logger = getLogger();

function debugOBSEvent(name, data) {
  logger.debug(`Event "${name}" with data: ${JSON.stringify(data)}`);
}

export class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.config = { ip: "", port: 0, password: "" };
    this.inputs = [];
    this.stream = false;
    this.hint = "";
  }

  /**
   * @param {string | undefined} ip 
   * @param {number | undefined} port 
   * @param {string | undefined} password 
   */
  async connect(ip = this.config.ip, port = this.config.port, password = this.config.password) {
    await this.disconnect();
    try {
      await this.obs.connect(`ws://${ip}:${port}`, password);
      this.connected = true;
      [ this.config.ip, this.config.port, this.config.password ] = [ ip, port, password ];
      logger.info("Connected to new OBS");
      this.getInputList();
    } catch(e) {
      logger.error(`Connection failed to ${this.config.ip}`);
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
    }
    logger.info("Disconnected from OBS");
  }

  _tryReconnect() {
    logger.info(`Try reconnecting to ${this.config.ip}`);
    setTimeout(async () => await this.connect(), 10000);
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
   *     inputKind: string
   *     inputName: string
   *     unversionedInputKind: string
   *   }[]>}
   */
  async getInputList() {
    const { inputs } = await this.obs.call("GetInputList");
    this.inputs = inputs;
    return inputs;
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
      this.connected = false;
      io.emit("obs_failed", { type: "connect", error: true });
      this._tryReconnect();
    });

    this.obs.on("StreamStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          this.stream = true;
          io.emit("obs state", { type: "stream", event: "start", stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          this.stream = false;
          io.emit("obs state", { type: "stream", event: "stop", stream: this.stream });
          break;
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      switch (args.outputState) {
        case "OBS_WEBSOCKET_OUTPUT_STARTED":
          io.emit("obs state", { type: "record", event: "start", stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_STOPPED":
          io.emit("obs state", { type: "record", event: "stop", stream: this.stream });
          break;
        case "OBS_WEBSOCKET_OUTPUT_PAUSED":
          io.emit("obs state", { type: "record", event: "paused", stream: this.stream });
      }
    });

    this.obs.on("MediaInputPlaybackStarted", (args) => {
      const kind = this.inputs.find(i => i.inputName === args.inputName).inputKind;
      if (["gstreamer-source", "ndi_source"].includes(kind)) {
        return;
      }
      io.emit("media response", { type: "media", event: "start", sourceName: args.inputName });
      debugOBSEvent("media response", { type: "media", event: "start", sourceName: args.inputName });
    });

    this.obs.on("MediaInputPlaybackEnded", (args) => {
      io.emit("media response", { type: "media", event: "stop" });
      debugOBSEvent("media response", { type: "media", event: "stop" });
    });

    this.obs.on("MediaInputActionTriggered", (args) => {
      this.stream = false;
      switch (args.mediaAction) {
        case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
          debugOBSEvent("media response", { type: "media", event: "paused" });
          io.emit("media response", { type: "media", event: "paused" });
          break;
      }
    });

    this.obs.on("InputMuteStateChanged", (args) => {
      io.emit("audio state", { input: args.inputName, inputMuted: args.inputMuted});
    });

    this.obs.on("InputCreated", async () => {
      const inputs = await this.getInputList();
      io.emit("input list", { inputs });
    });

    this.obs.on("InputRemoved", async () => {
      const inputs = await this.getInputList();
      io.emit("input list", { inputs });
    });
  }
}