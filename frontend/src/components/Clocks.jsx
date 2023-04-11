import React from "react";
import { useSelector } from "react-redux";
import { AudioState } from "./AudioState";
import { BlockClock } from "./BlockClock";
import { DirectorHints } from "./DirectorHints";
import { ErrorBlock } from "./ErrorBlock";
import { Loading } from "./Loading";
import { MainClock } from "./MainClock";
import { MediaClock } from "./MediaClock";
import { ObsClock } from "./ObsClock";

export const Clocks = () => {
  const state = useSelector((state) => state);
  if (!state.loading && (!state.socket || state.error)) {
    return (
      <div>
        <MainClock clockOnly={true}/>
        <ErrorBlock />
      </div>
    );
  }

  return (
    <div className="Clocks">
      {state.loading ? (
        <Loading size={"large"} />
      ) : (
        <>
          <section>
            <MainClock clockOnly={false}/>
            <BlockClock />
          </section>
          <section className="director-hints">
            <DirectorHints/>
            <AudioState/>
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
