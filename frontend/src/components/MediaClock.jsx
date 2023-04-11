import React, { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "./WebSocket";
import { ProgressBar } from "./ProgressBar";
import { useFormat } from "../hooks/customHooks";

export const MediaClock = () => {
  const { socket } = useContext(WebSocketContext);

  const [time, setTime] = useState(0);
  const [start, setStart] = useState(false);
  const [timer, setTimer] = useState(null);
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    socket.on("media response", (data) => {
      switch (data.event) {
        case "start":
          socket.emit("media info", data.sourceName);
          break;

        case "stop":
          setStart(false);
          setTime(0);
          setDuration(1);
          break;

        case "paused":
          setStart(false);
          break;

        case "duration":
          if (data.duration < 0 || data.time < 0) {
            break;
          }
          setDuration(data.duration);
          setTime(data.duration - data.time);
          clearInterval(timer);
          setStart(true);
          break;

        case "connect":
          if (data.duration < 0 || (data.duration - data.time < 0)) {
            break;
          }
          setTime(data.duration - data.time);
          setDuration(data.duration);
          if (data.state === "OBS_MEDIA_STATE_PLAYING") {
            clearInterval(timer);
            setStart(true);
          }
          break;

        default:
          break;
      }
    });
    return () => socket.off("media response");
  }, []);

  useEffect(() => {
    start ? tick() : clearInterval(timer);
  }, [start]);

  useEffect(() => {
    if (time < 1000) {
      setStart(false);
    }
  }, [time]);

  const tick = () => {
    setTimer(
      setInterval(() => {
        setTime((prevTime) => prevTime - 1000);
      }, 1000)
    );
  };

  const format = useFormat();

  return (
    <div className="media-clock">
      <p className="description">До конца ролика:</p>
      <ProgressBar completed={Math.round((1 - time / duration) * 1000) / 10}/>
      <p className="timer">{format(Math.floor(time / 1000))}</p>
    </div>
  );
};
