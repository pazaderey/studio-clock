import OBSWebSocket from "obs-websocket-js";
import { Server } from "socket.io";

import {
  EVENTS,
  INPUT_EVENTS,
  OBS_OUTPUT_EVENTS,
  STATE_TYPES,
} from "../types/index.js";
import { Logger } from "../logger.js";

import { MixerService } from "./mixerService.js";

export class OBSService extends MixerService {
  /**
   * @param {Server} io
   * @param {Logger} logger
   */
  constructor(io, logger) {
    super(io, logger);
    this.config.password = "";
    this._needReconnect = true;
    this.obs = new OBSWebSocket();
    this._registerEvents();
  }

  async connect(
    ip = this.config.ip,
    port = this.config.port,
    password = this.config.password
  ) {
    Object.assign(this.config, { ip, port, password });
    try {
      await this.obs.connect(`ws://${ip}:${port}`, password);
      this.connected = true;
      this._needReconnect = true;
      clearInterval(this._asker);
      this._logger.info("Connected to new OBS");

      this.getInputList();
    } catch (e) {
      this._logger.error(`Error connecting to ${ip}: ${e}`);
      this.connected = false;
    }
  }

  async disconnect() {
    this._logger.info(`Disconnected from OBS on ${this.config.ip}:${this.config.port}`);

    this._needReconnect = false;
    await this.obs.disconnect();
  }

  _tryReconnect() {
    if (!this._needReconnect) {
      return;
    }

    this._logger.info(`Try reconnecting to ${this.config.ip}`);

    this._asker = setInterval(async () => await this.connect(), 10000);
  }

  async getRecordStatus() {
    this._logger.debug("Call getRecordStatus");

    return this.obs.call("GetRecordStatus");
  }

  async getMediaInputStatus(inputName) {
    this._logger.debug(`Call getMediaInputStatus for input: ${inputName}`);

    return this.obs.call("GetMediaInputStatus", { inputName });
  }

  async getStreamStatus() {
    this._logger.debug("Call getStreamStatus");

    return this.obs.call("GetStreamStatus");
  }

  async getInputList() {
    this._logger.debug("Call getInputList");

    const { inputs } = await this.obs.call("GetInputList");
    this.inputs = inputs;
    return this.getInputs(i => i.inputName);
  }

  async getInputMute(inputName) {
    this._logger.debug(`Call getInputMute for input: ${inputName}`);

    try {
      const data = await this.obs.call("GetInputMute", { inputName });
      return data;
    } catch (e) {
      return { inputMuted: true };
    }
  }

  _registerEvents() {
    this._logger.debug("Registered events");

    this.obs.on("ConnectionOpened", () => {
      this._logger.debug("ConnectionOpened");

      this._io.emit(EVENTS.Connected);
      clearInterval(this._asker);

      this.obs.once("ConnectionClosed", (error) => {
        this._logger.debug("ConnectionClosed", error);

        this.connected = false;
        this._io.emit(EVENTS.Failed);
        this._tryReconnect();
      });
    });

    this.obs.on("StreamStateChanged", (args) => {
      this._logger.debug("StreamStateChanged", args);

      this.stream = args.outputActive;
      if (!this.record) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: OBS_OUTPUT_EVENTS[args.outputState]
        });
        return;
      }
      if (this.priority === STATE_TYPES.Stream) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: OBS_OUTPUT_EVENTS.OBS_WEBSOCKET_OUTPUT_STOPPED
        });
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: OBS_OUTPUT_EVENTS[args.outputState]
        });
      }
    });

    this.obs.on("RecordStateChanged", (args) => {
      this._logger.debug("RecordStateChanged", args);

      this.record = args.outputActive;
      if (!this.stream) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: OBS_OUTPUT_EVENTS[args.outputState]
        });
        return;
      }
      if (this.priority === STATE_TYPES.Record) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: OBS_OUTPUT_EVENTS.OBS_WEBSOCKET_OUTPUT_STOPPED
        });
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: OBS_OUTPUT_EVENTS[args.outputState]
        });
      }
    });

    this.obs.on("MediaInputPlaybackStarted", (args) => {
      this._logger.debug("MediaInputPlaybackStarted", args);

      const kind = this.inputs.find(i => i.inputName === args.inputName).inputKind;
      if (["gstreamer-source", "ndi_source"].includes(kind)) {
        return;
      }
      this._io.emit(EVENTS.MediaResponse, {
        event: INPUT_EVENTS.Start,
        sourceName: args.inputName
      });
    });

    this.obs.on("MediaInputPlaybackEnded", (args) => {
      this._logger.debug("MediaInputPlaybackEnded", args);

      this._io.emit(EVENTS.MediaResponse, { event: INPUT_EVENTS.Stop });
    });

    this.obs.on("MediaInputActionTriggered", (args) => {
      this._logger.debug("MediaInputActionTriggered", args);

      if (args.mediaAction === "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE") {
        this._io.emit(EVENTS.MediaResponse, { event: INPUT_EVENTS.Pause });
      }
    });

    this.obs.on("InputMuteStateChanged", (args) => {
      this._logger.debug("InputMuteStateChanged", args);

      this._io.emit(EVENTS.AudioState, {
        input: args.inputName,
        inputMuted: args.inputMuted
      });
    });

    this.obs.on("InputCreated", async () => {
      this._logger.debug("InputCreated");

      const { inputs } = await this.obs.call("GetInputList");
      this.inputs = inputs;
      this._io.emit(EVENTS.InputList, { inputs: this.getInputs(i => i.inputName) });
    });

    this.obs.on("InputRemoved", async () => {
      this._logger.debug("InputRemoved");

      const { inputs } = await this.obs.call("GetInputList");
      this.inputs = inputs;
      this._io.emit(EVENTS.InputList, { inputs: this.getInputs(i => i.inputName) });
    });
  }
}
