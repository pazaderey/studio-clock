import React from "react";

function ProgressBar({ completed }) {
  const fillerWidth = {
    width: `${completed}%`,
  }
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-filler" style={fillerWidth}>
        <span className="progress-bar-label">{"->"}</span>
      </div>
    </div>
  );
}

export default ProgressBar;
