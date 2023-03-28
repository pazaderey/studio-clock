import React, { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { types } from "../redux/types";

export function HintForm() {
  const dispatch = useDispatch();
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");

  function sendHint(event) {
    event.preventDefault();
    axios
      .post("/message", hint)
      .then((res) => {
        if (res.data.status === "error") {
          setError(res.data.description);
        } else {
          setHint("");
          setError("");
          dispatch({ type: types.HideModal });
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
