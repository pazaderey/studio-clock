import React, { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "./WebSocket";

export const MediaClock = () => {
  const { socket } = useContext(WebSocketContext);

  const [time, setTime] = useState(0);
  const [start, setStart] = useState(false);
  const [timer, setTimer] = useState(null);

  useEffect(() => {
    socket.on("media response", (data) => {
      switch (data.event) {
        case "start":
          socket.emit("media info", { sourceName: data.sourceName });
          break;

        case "stop":
          setStart(false);
          setTime(0);
          break;

        case "paused":
          setStart(false);
          break;

        case "duration":
          setTime(data.duration - data.time);
          setStart(true);
          break;

        case "connect":
          data.time > 100 && setTime(data.duration - data.time);
          data.state === "playing" && setStart(true);
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
    time < 1000 && setStart(false);
  }, [time]);

  const tick = () => {
    setTimer(
      setInterval(() => {
        setTime((prevTime) => prevTime - 1000);
      }, 1000)
    );
  };

  const format = (time) => {
    const seconds = Math.floor(time / 1000) % 60;
    const minutes = Math.floor(time / 1000 / 60) % 60;
    const hours = Math.floor(time / 1000 / 60 / 60);

    const formatted = [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");

    return formatted;
  };

  return (
    <section className="media-clock">
      <p className="description">До конца ролика:</p>
      <p className="timer">{format(time)}</p>
    </section>
  );
};
