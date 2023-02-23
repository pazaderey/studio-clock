import { useCallback } from "react";

export const useFormat = (...deps) => useCallback((time) => {
    const hours = Math.floor(time / 60 / 60);
    const minutes = Math.floor(time / 60) % 60;
    const seconds = time % 60;

    const formatted = [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");

    return formatted;
}, [deps]);