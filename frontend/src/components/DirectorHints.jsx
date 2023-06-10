import React, { useContext, useEffect, useState,  } from "react";
import { useDispatch } from "react-redux";

import { types } from "../redux/types";

import { HintForm } from "./HintForm";
import { HintModal } from "./HintModal";
import { WebSocketContext } from "./WebSocket";

export function DirectorHints() {
  const dispatch = useDispatch();
  const [hint, setHint] = useState("Подсказка");
  const { socket } = useContext(WebSocketContext);

  useEffect(() => {
    socket.on("director hint", (data) => {
      setHint(data.message);
    });

    socket.emit("director hint");

    return () => socket.off("director hint");
  });

  return (
    <div className="block-director-hint">
      <HintModal>
        <HintForm />
      </HintModal>
      <button
        className="btn btn-primary hint-btn"
        onClick={() => dispatch({ type: types.ShowModal })}
      >
        Изменить
      </button>
      <p className="hint">{hint}</p>
    </div>
  );
}
