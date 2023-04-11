import { getLogger } from "./logger.js";
import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";

const OBS_OUTPUT_EVENTS = {
  "OBS_WEBSOCKET_OUTPUT_STARTED": "start",
  "OBS_WEBSOCKET_OUTPUT_STOPPED": "stop",
  "OBS_WEBSOCKET_OUTPUT_PAUSED": "pause",
  "OBS_WEBSOCKET_OUTPUT_RESUMED": "resume"
}

const logger = getLogger();

export class OBSService {
  /**
   * @param {Server} io 
   */
  constructor(io) {
    this.obs = new OBSWebSocket();
    this._registerEvents(io);
    this.connected = false;
    this.config = { ip: "", port: 0, password: "" };
    this._asker = null;
    this.inputs = [];
    this.stream = false;
    this.record = false;
    this.priority = "auto";
    this.hint = "";
  }

  async connect(ip = this.config.ip, port = this.config.port, password = this.config.password) {
    Object.assign(this.config, { ip, port, password });
    try {
      await this.obs.connect(`ws://${ip}:${port}`, password);
      this.connected = true;
      clearInterval(this._asker);
      logger.info("Connected to new OBS");
      this.getInputList();
    } catch (e) {
      logger.error(`Error connecting to ${ip}: ${e}`);
      this.connected = false;
    }
  }

  _tryReconnect() {
    logger.info(`Try reconnecting to ${this.config.ip}`);
    this._asker = setInterval(async () => await this.connect(), 10000);
  }

  async getRecordStatus() {
    logger.debug("Call getRecordStatus");
    return this.obs.call("GetRecordStatus");
  }

  async getMediaInputStatus(inputName) {
    logger.debug(`Call getMediaInputStatus for input: ${inputName}`);
    return this.obs.call("GetMediaInputStatus", { inputName });
  }

  async getStreamStatus() {
    logger.debug("Call getStreamStatus");
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
    logger.debug("Call getInputList");
    const { inputs } = await this.obs.call("GetInputList");
    this.inputs = inputs;
    return inputs;
  }

  async getInputMute(inputName) {
    logger.debug(`Call getInputMute for input: ${inputName}`);
    try {
      const data = await this.obs.call("GetInputMute", { inputName });
      return data;
    } catch (e) {
      return { inputMuted: true };
    }
  }

  /**
   * @param {Server} io 
   */
  _registerEvents(io) {
    logger.debug("Registered events");
    this.obs.on("ConnectionOpened", () => {
      logger.debug("ConnectionOpened");
      io.emit("obs connected");
      clearInterval(this._asker);
      this.obs.once("ConnectionClosed", (error) => {
        logger.debug("ConnectionClosed", error);
        this.connected = false;
        io.emit("obs_failed", { type: "connect", error: true });
        this._tryReconnect();
      });
    });

    this.obs.on("StreamStateChanged", (args) => {
      logger.debug("StreamStateChanged", args)
      this.stream = args.outputActive;
      if (!this.record) {
        io.emit("obs state", { type: "stream", event: OBS_OUTPUT_EVENTS[args.outputState] });
        return;
      }
      if (this.priority === "stream") {
        io.emit("obs state", { type: "stream", event: OBS_OUTPUT_EVENTS.OBS_WEBSOCKET_OUTPUT_STOPPED });
        io.emit("obs state", { type: "stream", event: OBS_OUTPUT_EVENTS[args.outputState] });
        return;
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      logger.debug("RecordStateChanged", args);
      this.record = args.outputActive;
      if (!this.stream) {
        io.emit("obs state", { type: "record", event: OBS_OUTPUT_EVENTS[args.outputState] });
        return;
      }
      if (this.priority === "record") {
        io.emit("obs state", { type: "record", event: OBS_OUTPUT_EVENTS.OBS_WEBSOCKET_OUTPUT_STOPPED });
        io.emit("obs state", { type: "record", event: OBS_OUTPUT_EVENTS[args.outputState] });
        return;
      }
    });

    this.obs.on("MediaInputPlaybackStarted", (args) => {
      logger.debug("MediaInputPlaybackStarted", args);
      const kind = this.inputs.find(i => i.inputName === args.inputName).inputKind;
      if (["gstreamer-source", "ndi_source"].includes(kind)) {
        return;
      }
      io.emit("media response", { type: "media", event: "start", sourceName: args.inputName });
    });

    this.obs.on("MediaInputPlaybackEnded", (args) => {
      logger.debug("MediaInputPlaybackEnded", args);
      io.emit("media response", { type: "media", event: "stop" });
    });

    this.obs.on("MediaInputActionTriggered", (args) => {
      logger.debug("MediaInputActionTriggered", args);
      switch (args.mediaAction) {
        case "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE":
          io.emit("media response", { type: "media", event: "paused" });
          break;
      }
    });

    this.obs.on("InputMuteStateChanged", (args) => {
      logger.debug("InputMuteStateChanged", args);
      io.emit("audio state", { input: args.inputName, inputMuted: args.inputMuted });
    });

    this.obs.on("InputCreated", async () => {
      logger.debug("InputCreated");
      const inputs = await this.getInputList();
      io.emit("input list", { inputs });
    });

    this.obs.on("InputRemoved", async () => {
      logger.debug("InputRemoved");
      const inputs = await this.getInputList();
      io.emit("input list", { inputs });
    });
  }
}