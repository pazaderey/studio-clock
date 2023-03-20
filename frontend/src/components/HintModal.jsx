import React from "react";
import { useDispatch } from "react-redux";
import { types } from "../redux/types";

export function HintModal({ children, visible }) {
  const dispatch = useDispatch();
  const rootClasses = ["hint-modal"];
  if (visible) {
    rootClasses.push("active");
  }

  function clickAway() {
    dispatch({ type: types.HideModal });
  }

  return (
    <div className={rootClasses.join(" ")} onClick={clickAway}>
      <div className="hint-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
