import React, { createContext } from "react";
import { useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { types } from "../redux/types";

const WebSocketContext = createContext(null);

export { WebSocketContext };

export const WebSocketProvider = ({ children }) => {
  let socket;
  let valueContext;
  const dispatch = useDispatch();

  if (!socket) {
    dispatch({ type: types.ShowAppLoading });
    socket = io();

    socket.on("connect", function () {
      dispatch({
        type: types.SetSocket,
        payload: socket.connected,
      });
      dispatch({ type: types.HideError });
      dispatch({ type: types.HideAppLoading });
    });

    socket.on("obs_failed", () => {
      dispatch({
        type: types.ShowError,
        payload: socket.connected,
      });
      dispatch({ type: types.HideAppLoading });
    })

    socket.on("connect_error", () => {
      dispatch({
        type: types.SetSocket,
        payload: socket.connected,
      });
      dispatch({ type: types.HideAppLoading });
    });

    socket.on("disconnect", () => {
      dispatch({
        type: types.SetSocket,
        payload: socket.connected,
      });
    });

    valueContext = {
      socket: socket,
    };
  }

  return (
    <WebSocketContext.Provider value={valueContext}>
      {children}
    </WebSocketContext.Provider>
  );
};
