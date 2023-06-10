import React from "react";

import loading from "../img/Settings.gif";

export const Loading = ({ size }) => {
  return (
    <div className={`loader ${size}`}>
      <img src={loading} alt="" />
    </div>
  );
};
