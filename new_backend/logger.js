import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const env = process.env;

export function getLogger() {
  return new Logger({
    level: env.NODE_ENV === "development" ? "debug" : "info"
  });
}

const loggerLevels = {
  "silent": -1,
  "error": 0,
  "info": 1,
  "debug": 2,
}

class Logger {
  /**
   * @param {{
   *  level?: string
   * }} options 
   */
  constructor(options) {
    this.level = loggerLevels[options.level ?? "info"];
  }

  debug(...args) {
    if (this.level > 1) {
      console.log(`${new Date().toLocaleTimeString()} DEBUG `, ...args);
    }
  }

  info(...args) {
    if (this.level > 0) {
      console.log(`${new Date().toLocaleTimeString()} INFO  `, ...args);
    }
  }

  error(...args) {
    if (this.level > -1) {
      console.log(`${new Date().toLocaleTimeString()} ERROR `, ...args);
    }
  }
}
