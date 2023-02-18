import React, { useEffect, useState, useCallback, useContext } from "react";
import { WebSocketContext } from "./WebSocket";
import pause from "../img/pause.png";
import play from "../img/play.png";
import restart from "../img/restart.png";

export const BlockClock = ({ format, setBlock }) => {
  const { socket } = useContext(WebSocketContext);

  const [startBlock, setStartBlock] = useState("stop");
  const [timeBlock, setTimeBlock] = useState(0);
  const [timerBlock, setTimerBlock] = useState(null);

  useEffect(() => {
    socket.on("block_response", (data) => {
      switch (data.event) {
        case "start":
          if (data.info) {
            setTimeBlock(data.info);
            setStartBlock("return");
          } else {
            setStartBlock("start");
            setBlock(true);
          }
          break;

        case "pause":
          setStartBlock("stop");
          break;

        case "restart":
          setTimeBlock(0);
          setStartBlock("stop");
          break;

        default:
          break;
      }
    });
    return () => socket.off("block response");
  }, []);

  const tick = useCallback(() => {
    setTimerBlock(
      setInterval(() => {
        setTimeBlock((prevTime) => prevTime + 1);
      }, 1000)
    );
  }, [setTimerBlock, setTimeBlock, timeBlock]);

  useEffect(() => {
    if (startBlock === "start") {
      setTimeBlock(0);
      tick();
    } else if (startBlock === "return") {
      tick();
    }
    startBlock === "stop" && clearInterval(timerBlock);
  }, [startBlock]);

  function clickTimer(event) {
    socket.emit("block_event", {
      event,
      info: event === "start" ? timeBlock : "",
    });
  };

  return (
    <div className="block-info">
      <div className="block-clock">
        <p className="description">С начала блока:</p>
        <p className="timer">{format(timeBlock)}</p>
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
        <button className="btn btn-secondary" onClick={() => clickTimer("restart")}>
          {" "}
          <img src={restart} alt="restart" />
        </button>
      </div>
    </div>
  );
};
