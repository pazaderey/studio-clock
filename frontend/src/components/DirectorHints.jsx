import React, { useState, useContext, useEffect } from "react";
import { WebSocketContext } from "./WebSocket";
import { HintForm } from "./HintForm";
import { HintModal } from "./HintModal";
import { useDispatch, useSelector } from "react-redux";
import { types } from "../redux/types";

export function DirectorHints() {
  const dispatch = useDispatch();
  const modal = useSelector((state) => state.modal);
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

  function clickModal() {
    dispatch({ type: types.ShowModal });
  }

  return (
    <div className="block-director-hint">
      <HintModal visible={modal}><HintForm /></HintModal>
      <button className="btn btn-primary hint-btn" onClick={clickModal}>Изменить</button>
      <p className="hint">{hint}</p>
    </div>
  );
}
