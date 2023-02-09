import React from 'react';
import { Settings } from './components/Settings';
import { WebSocketProvider } from './components/WebSocket';
import { Clocks } from './components/Clocks';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

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
