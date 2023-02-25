import React, { useState } from "react";

export function DirectorHints() {
  const [hint, setHint] = useState("Подсказка");

  return (
    <div className="block-director-hint">
      <p className="description">{hint}</p>
    </div>
  )
}
