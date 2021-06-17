import React from 'react'
import { Settings } from './components/Settings';
import { WebSocketProvider } from './components/WebSocket';
import { Clocks } from './components/Clocks';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  //io.connect('http://localhost:5000')
  // const [socket, setSocket] = useState(socketIOClient('http://localhost:5000'))
  // const socket = useSelector(state => state.socket)
  // const dispatch = useDispatch()
    // const state = useSelector(state => state)

  // useEffect(() => {
  //   dispatch({
  //     type: types.SetSocket,
  //     payload: socketIOClient('http://localhost:5000')
  //   })
  // }, [])


  // if (socket) 
  // return () => socket.disconnect()

  // if (!state.loading && !state.socket)
  //   return <ErrorBlock />

  return (
    <WebSocketProvider>
      <div className="App">
        <Clocks />
        <Settings />
      </div>
    </WebSocketProvider>
  )
}

export default App;
