import React from "react";

export function ProgressBar({ completed }) {
  const fillerWidth = {
    width: `${completed}%`,
  }
  return (
    <div className="progress-bar-container">
      <div className="progress-bar-filler" style={fillerWidth}/>
    </div>
  );
}
