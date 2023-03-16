import React, { useState, useContext, useEffect } from "react";
import { WebSocketContext } from "./WebSocket";

export function DirectorHints() {
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
      <p className="description">{hint}</p>
    </div>
  )
}
