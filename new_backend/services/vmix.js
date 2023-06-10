import axios from "axios";
import { Server } from "socket.io";
import convert from "xml-js";

import {
  EVENTS,
  INPUT_EVENTS,
  IO_MEDIA_EVENTS,
  STATE_TYPES,
  VMIX_INPUT_STATES,
  VMIX_INPUT_TYPES,
} from "../types/index.js";
import { Logger } from "../logger.js";

import { MixerService } from "./mixerService.js";

export class VMixService extends MixerService {
  /**
   * @param {Server} io
   * @param {Logger} logger
   */
  constructor(io, logger) {
    super(io, logger);
    this.activeMedia = null;
    this.currentInput = null;
  }

  async connect(ip = this.config.ip, port = this.config.port) {
    Object.assign(this.config, { ip, port });
    try {
      await axios.get(`http://${ip}:${port}/api/`, {
        timeout: 5000,
      });
      this._logger.info(`Connected to vMix on ${ip}:${port}`);

      this._io.emit(EVENTS.Connected);
      this.connected = true;
      this._startAsking();
    } catch (e) {
      this._handleConnectionError(e, ip, port);
    }
  }

  async disconnect() {
    this._logger.info(`Disconnected from vMix on ${this.config.ip}:${this.config.port}`);

    this.connected = false;
    clearInterval(this._asker);
  }

  async getInputList() {
    return this.getInputs(i => i._attributes.title);
  }

  async getMediaInputStatus(inputName) {
    return {
      mediaDuration: this.activeMedia._attributes.duration,
      mediaCursor: this.activeMedia._attributes.position
    };
  }

  async getInputMute(inputName) {
    const currentInput = this.inputs.find(i => i._attributes.title === inputName);
    if (!currentInput) {
      return { inputMuted: true };
    }

    const inputMuted = currentInput._attributes.muted ?? true;
    this.currentInput = currentInput;
    return { inputMuted };
  }

  _startAsking() {
    this._logger.debug(`Started asking ${this.config.ip}:${this.config.port}`);

    clearInterval(this._asker);
    this._asker = setInterval(async () => {
      try {
        await this._ask();
      } catch (e) {
        this._handleConnectionError(e);
        this._io.emit(EVENTS.Failed);
        this._reconnect();
      }
    }, 1000);
  }

  async _ask() {
    const { data } = await axios.get(`http://${this.config.ip}:${this.config.port}/api/`, {
      timeout: 5000
    });
    const parsed = convert.xml2js(data, {
      compact: true,
      nativeType: true,
      nativeTypeAttributes: true
    }).vmix;
    const inputs = parsed.inputs.input;

    await Promise.all([
      this._checkOutputs(parsed),
      this._checkMedia(inputs),
      this._checkAudio(inputs)
    ]);
  }

  _handleConnectionError(e, ip = this.config.ip, port = this.config.port) {
    clearInterval(this._asker);
    this.connected = false;

    this._logger.error(`Connection to ${ip}:${port} failed due to an error: ${e}`);
  }

  _reconnect() {
    this._asker = setInterval(async () => {
      this._logger.info(`Try reconnecting to ${this.config.ip}:${this.config.port}`);

      await this.connect();
    }, 10000);
  }

  async _checkOutputs(data) {
    const state = [data.streaming._text, data.recording._text];
    await Promise.all([
      this._checkStream(...state),
      this._checkRecord(...state)
    ]);

    [this.stream, this.record] = state;
  }

  async _checkStream(stream, record) {
    if (this.stream ^ stream) {
      this._logger.debug(`Stream ${stream ? "started" : "stopped"}`);

      if (!record) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: stream ? INPUT_EVENTS.Start : INPUT_EVENTS.Stop
        });
        return;
      }

      if (this.priority === STATE_TYPES.Stream) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: INPUT_EVENTS.Stop
        });

        stream && this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Stream,
          event: INPUT_EVENTS.Start
        });
      }
    }
  }

  async _checkRecord(stream, record) {
    if (this.record ^ record) {
      this._logger.debug(`Record ${record ? "started" : "stopped"}`);

      if (!stream) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: record ? INPUT_EVENTS.Start : INPUT_EVENTS.Stop
        });
        return;
      }

      if (this.priority === STATE_TYPES.Record) {
        this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: INPUT_EVENTS.Stop
        });

        record && this._io.emit(EVENTS.State, {
          type: STATE_TYPES.Record,
          event: INPUT_EVENTS.Start
        });
      }
    }
  }

  async _checkMedia(inputs) {
    this.activeMedia
      ? this._checkActiveMedia(inputs)
      : this._findActiveMedia(inputs);
  }

  _checkActiveMedia(inputs) {
    const media = inputs.find(i => i._attributes.key === this.activeMedia._attributes.key);
    if (media && this.activeMedia._attributes.state !== media._attributes.state) {
      this._logger.debug(`Media ${media._attributes.title} state changed to ${media._attributes.state}`);

      this._io.emit(EVENTS.MediaResponse, {
        event: IO_MEDIA_EVENTS[media._attributes.state],
        sourceName: this.activeMedia._attributes.title
      });

      if (this._isCompleted(media)) {
        this.activeMedia = null;
        return;
      }
    }

    this.activeMedia = media;
  }

  _findActiveMedia(inputs) {
    const playingMedia = inputs.find(i => this._isPlaying(i) && this._isVideo(i));
    if (playingMedia) {
      this.activeMedia = playingMedia;
      this._io.emit(EVENTS.MediaResponse, {
        event: IO_MEDIA_EVENTS.Running,
        sourceName: this.activeMedia._attributes.title
      });
    }
  }

  async _checkAudio(inputs) {
    this._checkInputList(inputs);

    this.currentInput && this._checkCurrentInput(inputs);
  }

  _checkInputList(inputs) {
    const oldInputs = this.inputs.map(i => i._attributes.title);
    const newInputs = inputs.map(i => i._attributes.title);
    if (oldInputs.join("") !== newInputs.join("")) {
      this._logger.debug("Input list changed: ", newInputs);

      this._io.emit(EVENTS.InputList, { inputs: newInputs });
      this.inputs = inputs;
    }

    if (this.currentInput && !newInputs.includes(this.currentInput._attributes.title)) {
      this._io.emit(EVENTS.AudioChange, {
        data: "",
        inputMuted: true
      });

      this.currentInput = null;
    }
  }

  _checkCurrentInput(inputs) {
    const input = inputs.find(i => i._attributes.key === this.currentInput._attributes.key);
    if (input._attributes.muted ^ this.currentInput._attributes.muted) {
      this._logger.debug(`Audio ${input._attributes.title} state changed to ${input._attributes.muted ? "muted" : "unmuted"}`);

      this._io.emit(EVENTS.AudioState, { inputMuted: input._attributes.muted });
      this.currentInput = input;
    }
  }

  _isPlaying(input) {
    return input._attributes.state === VMIX_INPUT_STATES.Running;
  }

  _isVideo(input) {
    return input._attributes.type === VMIX_INPUT_TYPES.Video;
  }

  _isCompleted(media) {
    return media._attributes.state === VMIX_INPUT_STATES.Completed;
  }
}
