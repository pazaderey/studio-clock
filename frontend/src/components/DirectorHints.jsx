import React, { useState, useContext, useEffect } from "react";
import { WebSocketContext } from "./WebSocket";
import { HintForm } from "./HintForm";
import { HintModal } from "./HintModal";

export function DirectorHints() {
  const [hint, setHint] = useState("Подсказка");
  const [modal, setModal] = useState(false);
  const { socket } = useContext(WebSocketContext);

  useEffect(() => {
    socket.on("director hint", (data) => {
      if (data && data.message) {
        setHint(data.message);
      }
    });

    return () => socket.off("director hint");
  });

  const sendHint = () => {
    setModal(false);
  };

  return (
    <div className="block-director-hint">
      <HintModal visible={modal} setVisible={setModal}><HintForm send={sendHint}/></HintModal>
      <button className="hint-btn" onClick={() => setModal(true)}>Изменить</button>
      <p className="hint">{hint}</p>
    </div>
  );
}
