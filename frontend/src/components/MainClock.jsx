import React, { useEffect, useState } from "react";

export const MainClock = ({ clockOnly }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
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
