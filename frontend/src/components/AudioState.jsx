import React, { useContext, useEffect, useState } from "react";
import { WebSocketContext } from "./WebSocket";
import audio from "../img/audio.png";
import noAudio from "../img/noAudio.png";

export function AudioState() {
  const [state, setState] = useState(audio);
  const [inputList, setInputList] = useState([]);
  const [source, setSource] = useState("");

  const { socket } = useContext(WebSocketContext);

  useEffect(() => {
    socket.on("my response", (data) => {
      if (data.type === "connect") {
        socket.emit("input list");
      }
    });

    socket.on("input list", ({ inputs }) => {
      setInputList(inputs.map(i => i.inputName));
    });

    return () => {
      socket.off("my response");
      socket.off("input list");
    };
  });

  useEffect(() => {
    socket.on("audio state", (data) => {
      if (data.input === source) {
        data.state ? setState(audio) : setState(noAudio);
      }
    });

    return () => socket.off("audio state");
  }, [source]);

  function changeSource() {
    const selectedSource = document.getElementById("source-select").value;
    socket.off("audio state");
    setSource(selectedSource);
    socket.emit("check input", selectedSource);
  }

  return (
    <div className="block-audio-state">
      <img src={state} alt="Audio Input State"/>
      <select id="source-select" onChange={changeSource}>
        <option value="" disabled>OBS Audio source</option>
        {inputList.map((i, ind) => <option value={i} key={ind+1}>{i}</option>)}
      </select>
    </div>
  );
}