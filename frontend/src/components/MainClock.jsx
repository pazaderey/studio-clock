import React, { useEffect, useState } from "react";

export const MainClock = ({ clockOnly }) => {
  function getTime() {
    return new Date().toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const [time, setTime] = useState(getTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTime);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  });

  return (
    <div className={clockOnly ? "clock-only" : "main-clock"}>
      {clockOnly ? "" : <p className="description">GMT+3</p>}
      <p className="timer">{time}</p>
    </div>
  );
};
