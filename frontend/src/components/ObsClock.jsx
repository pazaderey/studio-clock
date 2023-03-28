import React, { useEffect, useState, useCallback, useContext } from "react";
import { useFormat } from "../hooks/customHooks";
import { WebSocketContext } from "./WebSocket";
import { useDispatch } from "react-redux";
import { types } from "../redux/types";

export const ObsClock = () => {
  const { socket } = useContext(WebSocketContext);
  const dispatch = useDispatch();

  const [start, setStart] = useState(false);
  const [cont, setCont] = useState(false);
  const [timer, setTimer] = useState(null);
  const [time, setTime] = useState(0);
  const [eventName, setEventName] = useState("записи/эфира");

  const continueTime = (cont, strTime) => {
    let sec = 0;
    if (strTime)
      sec =
        +strTime[2].split(".")[0] + +strTime[1] * 60 + +strTime[0] * 60 * 60;
    setCont(cont);
    setStart(cont);
    setTime(sec);
    return sec;
  };

  useEffect(() => {
    socket.on("obs state", (data) => {
      switch (data.type) {
        case "connect":
          if (data.stream) {
            setEventName("эфира");
            continueTime(true, data.streamTime.split(":"));
          } else if (data.recording) {
            setEventName("записи");
            continueTime(!data.recordPause, data.recordTime.split(":"));
          } else break;
          break;

        case "record":
          if (data.event === "start" && !data.stream) {
            setEventName("записи");
            setStart(true);
          } else if (data.event === "paused") {
            setStart(false);
            setCont(false);
          } else if (data.event === "resume") {
            continueTime(true, data.time["rec-timecode"].split(":"));
          } else {
            if (!data.stream) {
              setCont(false);
              setStart(false);
            }
          }
          break;

        case "stream":
          if (data.event === "start") {
            setTime(0);
            setCont(false);
            setStart(true);
          } else {
            setTime(0);
            setCont(false);
            setStart(false);
          }
          break;

        case "error":
          dispatch({ type: types.ShowError, payload: data.mes });
          break;

        default:
          break;
      }
    });

    return () => socket.off("obs state");
  }, []);

  const format = useFormat(time);

  useEffect(() => {
    if (start) {
      !cont && setTime(0);
      tick();
    }
    !start && clearInterval(timer);
  }, [start]);

  const tick = useCallback(() => {
      setTimer(
        setInterval(() => {
          setTime((prevTime) => prevTime + 1);
        }, 1000)
      );
    }, [setTimer, setTime]);

  return (
    <div className={"streaming-container only-stream"}>
      <p className="description">С начала {eventName}:</p>
      <p className={"timer " + (start ? "playing-stream" : "")}>
        {format(time)}
      </p>
    </div>
  );
};
