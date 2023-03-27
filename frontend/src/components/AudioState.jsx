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
      if (inputList.length > 0 && !source) {
        setSource(inputList[0]);
      }
    });

    return () => socket.off("input list");
  });

  useEffect(() => {
    socket.on("audio state", (data) => {
      if (data.input === source) {
        data.state ? setState(audio) : setState(noAudio);
      }
    });

    return () => socket.off("audio state");
  }, [source]);

  function changeSource(selectedSource) {
    socket.off("audio state");
    setSource(selectedSource);
    socket.emit("check input", selectedSource);
  }

  return (
    <div className="block-audio-state">
      <img src={state} alt="Audio Input State"/>
      <select onChange={(e) => changeSource(e.target.value)}>
        <option value="" disabled>OBS Audio source</option>
        {inputList.map((i, ind) => <option value={i} key={ind+1}>{i}</option>)}
      </select>
    </div>
  );
}