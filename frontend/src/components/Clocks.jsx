import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { BlockClock } from "./BlockClock";
import { ErrorBlock } from "./ErrorBlock";
import { Loading } from "./Loading";
import { MainClock } from "./MainClock";
import { MediaClock } from "./MediaClock";
import { ObsClock } from "./ObsClock";

export const Clocks = () => {
  const state = useSelector((state) => state);
  const format = useCallback((time) => {
    const hours = Math.floor(time / 60 / 60);
    const minutes = Math.floor(time / 60) % 60;
    const seconds = time % 60;

    const formatted = [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");

    return formatted;
  }, []);

  if (!state.loading && (!state.socket || state.error)) return <ErrorBlock />;

  return (
    <div className="Clocks">
      {state.loading ? (
        <Loading size={"large"} />
      ) : (
        <>
          <section>
            <MainClock />
            <BlockClock format={format}/>
          </section>
          <section>

          </section>
          <section>
            <ObsClock />
            <MediaClock />
          </section>
        </>
      )}
    </div>
  );
};
