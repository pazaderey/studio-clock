import React, { useCallback, useContext, useEffect, useState, } from "react";

import { useFormat } from "../hooks/customHooks";
import no_rec from "../img/no_rec.png";
import no_stream from "../img/no_stream.png";
import recording from "../img/recording.png";
import streaming from "../img/stream.png";

import { WebSocketContext } from "./WebSocket";

export const StateClock = () => {
  const { socket } = useContext(WebSocketContext);

  const [start, setStart] = useState(false);
  const [cont, setCont] = useState(false);
  const [timer, setTimer] = useState(null);
  const [time, setTime] = useState(0);
  const [desc, setDesc] = useState("записи/эфира");
  const [priority, setPriority] = useState("auto");
  const [stream, setStream] = useState(no_stream);
  const [rec, setRec] = useState(no_rec);

  const format = useFormat(time);
  const favicon = document.getElementById("favicon");

  const EVENTS = {
    "auto": "записи/эфира",
    "connect": "записи/эфира",
    "stream": "эфира",
    "record": "записи"
  };

  useEffect(() => {
    socket.on("mixer state", (data) => {
      setDesc(EVENTS[data.type]);
      switch (data.event) {
        case "connect":
          if (data.stream) {
            setStream(streaming);
            continueTime(true, data.streamTime.split(':'));
          } else if (data.recording) {
            setRec(recording);
            continueTime(!data.recordPause, data.recordTime.split(':'));
          }
          break;
        case "start":
          data.type === "stream" ? setStream(streaming) : setRec(recording);
          setCont(false);
          setStart(true);
          break;
        case "stop":
          data.type === "stream" ? setStream(no_stream) : setRec(no_rec);
          setCont(false);
          setStart(false);
          break;
        case "resume":
          setRec(recording);
          continueTime(true, data.time['rec-timecode'].split(':'));
          break;
        case "pause":
          setRec(no_rec);
          setStart(false);
          setCont(false);
          break;
        default:
          break;
      }
    });

    socket.on("mixer priority", ({ event }) => {
      setPriority(event);
    });

    return () => {
      socket.off("mixer state");
      socket.off("mixer priority");
    }
  }, []);

  useEffect(() => {
    if (start) {
      !cont && setTime(0);
      tick();
      favicon.href = "favicon-red.ico";
    } else {
      clearInterval(timer);
      favicon.href = "favicon.ico";
    }
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
    socket.emit("mixer priority", { event: event === priority ? "auto" : event });
  }

  return (
    <div className={"streaming-container only-stream"}>
      <div className="mixer-clock-icons">
        <img
          src={stream}
          className={`mixer-icon ${priority === "stream" ? "priority" : ""}`}
          alt="stream icon"
          onClick={() => clickIcon("stream")}
        />
        <img
          src={rec}
          className={`mixer-icon ${priority === "record" ? "priority" : ""}`}
          alt="stream icon"
          onClick={() => clickIcon("record")}
        />
      </div>
      <div className="mixer-clock-clock">
        <p className="description">С начала {desc}:</p>
        <p className={"timer " + (start ? "playing-stream" : "")}>
          {format(time)}
        </p>
      </div>
    </div>
  );
};
