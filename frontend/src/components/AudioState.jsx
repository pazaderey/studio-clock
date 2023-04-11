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
    socket.on("input list", ({ inputs }) => {
      setInputList(inputs.map(i => i.inputName));
    });

    socket.on("audio change", (data) => {
      setSource(data.input);
      setState(data.inputMuted ? noAudio : audio);
    });

    socket.on("audio state", (data) => {
      if (data.input === source) {
        setState(data.inputMuted ? noAudio : audio);
      }
    });

    return () => {
      socket.off("input list");
      socket.off("audio change");
      socket.off("audio state");
    };
  });

  function changeSource(selectedSource) {
    socket.emit("audio change", selectedSource);
  }

  return (
    <div className="block-audio-state">
      <img src={state} alt="Audio Input State"/>
      <select onChange={(e) => changeSource(e.target.value)} value={source}>
        <option value="" disabled hidden>OBS Audio source</option>
        {inputList.map((i, ind) => <option value={i} key={ind+1}>{i}</option>)}
      </select>
    </div>
  );
}