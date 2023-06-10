import React, { useEffect, useState } from "react";

export const MainClock = ({ clockOnly }) => {
  function getTime() {
    return new Date().toLocaleTimeString([], { hour12: false });
  }

  const [time, setTime] = useState(getTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getTime);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={clockOnly ? "clock-only" : "main-clock"}>
      {clockOnly ? "" : <p className="description">{`GMT+${new Date().getTimezoneOffset() / -60}`}</p>}
      <p className="timer">{time}</p>
    </div>
  );
};
