export * from "./obsTypes.js";
export * from "./vmixTypes.js";

const EVENTS = {
  Connected: "mixer connected",
  Failed: "mixer failed",
  State: "mixer state",
  Hint: "director hint",
  Block: "block change",
  InputList: "input list",
  MediaInfo: "media info",
  MediaResponse: "media response",
  AudioChange: "audio change",
  AudioState: "audio state",
  Priority: "mixer priority",
};

const STATE_TYPES = {
  Stream: "stream",
  Record: "record"
};

const INPUT_EVENTS = {
  Start: "start",
  Stop: "stop",
  Pause: "paused",
  Duration: "duration"
};

const RESPONSE_STATUSES = {
  Ok: "ok",
  Error: "error"
};

export {
  EVENTS,
  INPUT_EVENTS,
  STATE_TYPES,
  RESPONSE_STATUSES
};
