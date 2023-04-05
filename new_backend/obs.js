import { getLogger } from "./logger.js"; 
import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";

const OBS_EVENTS = {
  "OBS_WEBSOCKET_OUTPUT_STARTED": "start",
  "OBS_WEBSOCKET_OUTPUT_STOPPED": "stop",
  "OBS_WEBSOCKET_OUTPUT_PAUSED": "pause",
  "OBS_WEBSOCKET_OUTPUT_RESUMED": "resume"
}

const logger = getLogger();

export class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.config = { ip: "", port: 0, password: "" };
    this._asker = null;
    this.inputs = [];
    this.stream = false;
    this.record = false;
    this.priority = "auto";
    this.hint = "";
  }

  /**
   * @param {string | undefined} ip 
   * @param {number | undefined} port 
   * @param {string | undefined} password 
   */
  async connect(ip = this.config.ip, port = this.config.port, password = this.config.password) {
    [ this.config.ip, this.config.port, this.config.password ] = [ ip, port, password ];
    try {
      await this.obs.connect(`ws://${this.config.ip}:${this.config.port}`, this.config.password);
      this.connected = true;
      clearInterval(this._asker);
      logger.info("Connected to new OBS");
      this.getInputList();
    } catch(e) {
      logger.error(`Error connecting to ${this.config.ip}: ${e}`);
      this.connected = false;
    }
  }

  _tryReconnect() {
    logger.info(`Try reconnecting to ${this.config.ip}`);
    this._asker = setInterval(async () => await this.connect(), 10000);
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
   * Should be called once before the first connect!
   * @param {Server} io 
   */
  registerEvents(io) {
    this.obs.on("ConnectionOpened", () => {
      io.emit("obs connected");
      clearInterval(this._asker);
      this.obs.once("ConnectionClosed", (error) => {
        logger.debug("OBS connection closed");
        this.connected = false;
        io.emit("obs_failed", { type: "connect", error: true });
        this._tryReconnect();
      });
    });

    this.obs.on("StreamStateChanged", (args) => {
      if (!Object.keys(OBS_EVENTS).includes(args.outputState)) {
        return;
      }
      this.stream = args.outputActive;
      if (!this.record) {
        io.emit("obs state", { type: "stream", event: OBS_EVENTS[args.outputState] });
        return;
      }
      if (this.priority === "stream") {
        io.emit("obs state", { type: "stream", event: "stop" });
        io.emit("obs state", { type: "stream", event: OBS_EVENTS[args.outputState] });
        return;
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      if (!Object.keys(OBS_EVENTS).includes(args.outputState)) {
        return;
      }
      this.record = args.outputActive;
      if (!this.stream) {
        io.emit("obs state", { type: "record", event: OBS_EVENTS[args.outputState] });
        return;
      }
      if (this.priority === "record") {
        io.emit("obs state", { type: "record", event: "stop" });
        io.emit("obs state", { type: "record", event: OBS_EVENTS[args.outputState] });
        return;
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