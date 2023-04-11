import React, { useState, useContext, useEffect } from "react";
import { WebSocketContext } from "./WebSocket";
import { HintForm } from "./HintForm";
import { HintModal } from "./HintModal";
import { useDispatch } from "react-redux";
import { types } from "../redux/types";

export function DirectorHints() {
  const dispatch = useDispatch();
  const [hint, setHint] = useState("Подсказка");
  const { socket } = useContext(WebSocketContext);

  useEffect(() => {
    socket.on("director hint", (data) => {
      if (data && data.message) {
        setHint(data.message);
      }
    });

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
