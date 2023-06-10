import axios from "axios";
import React, { useCallback, useContext, useEffect, useState, } from "react";

import { useFormat } from "../hooks/customHooks";
import pause from "../img/pause.png";
import play from "../img/play.png";
import restart from "../img/restart.png";

import { WebSocketContext } from "./WebSocket";

export const BlockClock = () => {
  const format = useFormat();
  const { socket } = useContext(WebSocketContext);

  const [startBlock, setStartBlock] = useState("stop");
  const [time, setTime] = useState(0);
  const [timerBlock, setTimerBlock] = useState(null);

  useEffect(() => {
    socket.on("block change", (data) => {
      switch (data.event) {
        case "start":
          if (!timerBlock) {
            setStartBlock("start");
          }
          break;
        case "pause":
          setStartBlock("stop");
          break;
        default:
          setTime(0);
          setStartBlock("stop");
      }
    });

    return () => socket.off("block change");
  }, []);

  const tick = useCallback(() => {
    setTimerBlock(
      setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000)
    );
  }, [setTimerBlock, setTime, time]);

  function clickTimer(event) {
    axios.post(`/block/${event}`);
  }

  useEffect(() => {
    switch (startBlock) {
      case "start":
        tick();
        break;
      default:
        clearInterval(timerBlock);
        break;
    }
  }, [startBlock]);

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
        <button
          className="btn btn-secondary"
          onClick={() => clickTimer("stop")}
        >
          {" "}
          <img src={restart} alt="restart" />
        </button>
      </div>
    </div>
  );
};
