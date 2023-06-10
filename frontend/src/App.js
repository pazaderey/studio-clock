import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import React from 'react';

import { Clocks } from './components/Clocks';
import { Settings } from './components/Settings';
import { WebSocketProvider } from './components/WebSocket';

function App() {
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
