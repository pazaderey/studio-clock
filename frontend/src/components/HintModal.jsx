import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { types } from "../redux/types";

export function HintModal({ children }) {
  const dispatch = useDispatch();
  const visible = useSelector((state) => state.modal);

  const rootClasses = ["hint-modal"];
  if (visible) {
    rootClasses.push("active");
  }

  return (
    <div
      className={rootClasses.join(" ")}
      onClick={() => dispatch({ type: types.HideModal })}
    >
      <div className="hint-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
