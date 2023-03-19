import React from "react";

export function HintModal({ children, visible, setVisible }) {
  const rootClasses = ["hint-modal"];
  if (visible) {
    rootClasses.push("active");
  }

  return (
    <div className={rootClasses.join(" ")} onClick={() => setVisible(false)}>
      <div className="hint-modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
