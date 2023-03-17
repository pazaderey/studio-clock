import React, { useState, useCallback, useContext, useEffect } from "react";
import { useFormat } from "../hooks/customHooks";
import { WebSocketContext } from "./WebSocket";
import pause from "../img/pause.png";
import play from "../img/play.png";
import restart from "../img/restart.png";

export const BlockClock = () => {
  const format = useFormat();
  const { socket } = useContext(WebSocketContext);

  const [time, setTime] = useState(0);
  const [timerBlock, setTimerBlock] = useState(null);

  useEffect(() => {
    socket.on("block status", ({ event }) => {
      switch (event) {
        case "start":
          if (!timerBlock) {
            tick();
          }
          break;
        case "pause":
          pauseTimer();
          break;
        default:
          setTime(0);
          pauseTimer();
      }
    });
  });

  const tick = useCallback(() => {
    setTimerBlock(
      setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000)
    );
  }, []);

  function clickTimer(event) {
    socket.emit("block changed", { event });
  }

  function pauseTimer() {
    clearInterval(timerBlock);
    setTimerBlock(null);
  }

  return (
    <div className="block-info">
      <div className="block-clock">
        <p className="description">С начала блока:</p>
        <p className="timer">{format(time)}</p>
      </div>
      <div className="block-buttons">
        <button className="btn btn-success" onClick={() => clickTimer("start")}>
          {" "}
          <img src={play} alt="play" />
        </button>
        <button className="btn btn-danger" onClick={() => clickTimer("pause")}>
          {" "}
          <img src={pause} alt="pause" />{" "}
        </button>
        <button className="btn btn-secondary" onClick={() => clickTimer("stop")}>
          {" "}
          <img src={restart} alt="restart" />
        </button>
      </div>
    </div>
  );
};
