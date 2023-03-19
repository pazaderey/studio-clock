import React, { useState } from "react";
import axios from "axios";

export function HintForm({ send }) {
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  function sendHint(event) {
    event.preventDefault();
    axios
      .post("/message", { message: hint })
      .then((res) => {
        if (res.data.status === "error") {
          setError(res.data.description);
        } else {
          setHint("");
          setError("");
          send();
        }
      });
  }

  return (
    <form>
      <input
        className="hint-input"
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        type="text"
        placeholder="Подсказка"
        maxLength="25"
      ></input>
      <button className="hint-send-btn" onClick={sendHint}>Отправить</button>
      <p className="hint-error">{error}</p>
    </form>
  );
}
