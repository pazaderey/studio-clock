import React, { useEffect, useState, useCallback, useContext } from "react";
import { useFormat } from "../hooks/customHooks";
import { WebSocketContext } from "./WebSocket";
import stream from "../img/stream.png";
import recording from "../img/recording.png";

export const ObsClock = () => {
  const { socket } = useContext(WebSocketContext);

  const [start, setStart] = useState(false);
  const [cont, setCont] = useState(false);
  const [timer, setTimer] = useState(null);
  const [time, setTime] = useState(0);
  const [desc, setDesc] = useState("записи/эфира");
  const [priority, setPriority] = useState("auto");

  const format = useFormat(time);

  const EVENTS = {
    "auto": "записи/эфира",
    "connect": "записи/эфира",
    "stream": "эфира",
    "record": "записи"
  };

  useEffect(() => {
    socket.on("obs state", (data) => {
      setDesc(EVENTS[data.type]);
      switch (data.event) {
        case "connect":
          if (data.stream) {
            continueTime(true, data.streamTime.split(':'));
          } else if (data.recording) {
            continueTime(!data.recordPause, data.recordTime.split(':'));
          }
          break;
        case "start":
          setCont(false);
          setStart(true);
          break;
        case "stop":
          setCont(false);
          setStart(false);
          break;
        case "resume":
          continueTime(true, data.time['rec-timecode'].split(':'));
          break;
        case "pause":
          setStart(false);
          setCont(false);
          break;
        default:
          break;
      }
    });

    socket.on("obs priority", ({ event }) => {
      setPriority(event);
    });

    return () => {
      socket.off("obs state");
      socket.off("obs priority");
    }
  }, []);

  useEffect(() => {
    if (start) {
        !cont && setTime(0)
        tick();
    }
    !start && clearInterval(timer)
  }, [start]);


  function continueTime(cont, strTime) {
    let sec = 0;
    if (strTime)
      sec =
        +strTime[2].split(".")[0] + +strTime[1] * 60 + +strTime[0] * 60 * 60;
    setCont(cont);
    setStart(cont);
    setTime(sec);
    setDesc(EVENTS.record);
    return sec;
  };

  const tick = useCallback(() => {
    setTimer(
      setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000)
    );
  }, [setTimer, setTime]);

  function clickIcon(event) {
    socket.emit("obs priority", { event: event === priority ? "auto" : event });
  }

  return (
    <div className={"streaming-container only-stream"}>
      <div className="obs-clock-icons">
        <img
          src={stream}
          className={`obs-icon ${priority === "stream" ? "priority" : ""}`}
          alt="stream icon"
          onClick={() => clickIcon("stream")}
        />
        <img
          src={recording}
          className={`obs-icon ${priority === "record" ? "priority" : ""}`}
          alt="stream icon"
          onClick={() => clickIcon("record")}
        />
      </div>
      <div className="obs-clock-clock">
        <p className="description">С начала {desc}:</p>
        <p className={"timer " + (start ? "playing-stream" : "")}>
          {format(time)}
        </p>
      </div>
    </div>
  );
};
