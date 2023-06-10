import dotenv from "dotenv";

dotenv.config({ path: ".env" });
const env = process.env;

export function getLogger() {
  return new Logger({
    level: env.NODE_ENV === "development" ? "debug" : "info"
  });
}

const loggerLevels = {
  silent: -1,
  error: 0,
  info: 1,
  debug: 2,
};

export class Logger {
  /**
   * @param {{
   *  level?: "silent" | "error" | "info" | "debug"
   * }} options
   */
  constructor(options) {
    this.level = loggerLevels[options.level ?? "info"];
  }

  debug(...args) {
    this._log("debug", ...args);
  }

  info(...args) {
    this._log("info", ...args);
  }

  error(...args) {
    this._log("error", ...args);
  }

  _log(level, ...args) {
    if (this.level >= loggerLevels[level]) {
      console.log(`${new Date().toLocaleTimeString()} ${level.toUpperCase().padEnd(5)} `, ...args);
    }
  }
}
