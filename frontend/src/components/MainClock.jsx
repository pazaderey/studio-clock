import React, { useEffect, useState } from "react";

export const MainClock = () => {
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
    <section className="main-clock">
      <p className="timer">{time}</p>
    </section>
  );
};
