import React, { useState, useEffect } from 'react';
import { Settings } from './components/Settings';
import { WebSocketProvider } from './components/WebSocket';
import { Clocks } from './components/Clocks';
import { ErrorBlock } from './components/ErrorBlock';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { types } from "./redux/types";

function App() {
  const [socket, setSocket] = useState(io('http://localhost:5000'));
  const dispatch = useDispatch();
  const state = useSelector(state => state);

  useEffect(() => {
    dispatch({
      type: types.SetSocket,
      payload: io('http://localhost:5000')
    })
  }, []);


  if (socket) {
    return () => socket.disconnect();
  }

  if (!state.loading && !state.socket) {
    return (
      <ErrorBlock />
    );
  }

  return (
    <WebSocketProvider>
      <div className="App">
        <Clocks />
        <Settings />
      </div>
    </WebSocketProvider>
  );
}

export default App;
