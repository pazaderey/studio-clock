import pino from "pino";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const env = process.env;

export function getLogger() {
    return pino({
        level: env.NODE_ENV === "production" ? "info" : "trace",
    });
}
