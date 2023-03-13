import React, { useEffect, useState } from "react";

export const MainClock = ({ clockOnly }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  });

  return (
    <div className={clockOnly ? "clock-only" : "main-clock"}>
      <p className="description">GMT+3</p>
      <p className="timer">{time}</p>
    </div>
  );
};
