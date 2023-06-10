import { Logger } from "../logger.js";

export class MixerService {
  /**
   * @param {Server} io
   * @param {Logger} logger
   */
  constructor(io, logger) {
    this.connected = false;
    this._io = io;
    this.config = { ip: "", port: 0 };
    this._asker = null;
    this.stream = false;
    this.record = false;
    this.priority = "auto";
    this.inputs = [];
    this._logger = logger;
  }

  async connect() {}

  disconnect() {}

  getInputs(callback) {
    return this.inputs.map(callback);
  }

  async getMediaInputStatus() {}

  async getInputMute() {}
}
