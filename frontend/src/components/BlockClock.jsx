import React, { useEffect, useState, useCallback } from 'react';
import pause from '../img/pause.png'
import play from '../img/play.png'
import restart from '../img/restart.png'

export const BlockClock = ({ format, socket, setBlock }) => {

    const [startBlock, setStartBlock] = useState('stop')
    const [timeBlock, setTimeBlock] = useState(0)
    const [timerBlock, setTimerBlock] = useState(null)

    useEffect(() => {
        socket.on('block response', data => {
            data = JSON.parse(data)
            switch (data.event) {

                case 'start':
                    if (data.info) {
                        setTimeBlock(data.info)
                        setStartBlock('return')
                    }
                    else {
                        setStartBlock('start')
                        setBlock(true)
                    }
                    break;

                case 'pause':
                    setStartBlock('stop')
                    break;

                case 'restart':
                    setTimeBlock(0)
                    setStartBlock('stop')
                    break;

                default:
                    break;
            }
        })
        return () => socket.off('block response')
    }, [])

    const tick = useCallback(() => {
        setTimerBlock(setInterval(() => {
            setTimeBlock(prevTime => prevTime + 1)
        }, 1000))
    }, [setTimerBlock, setTimeBlock, timeBlock])

    // const tick = () => {
    //     setTimerBlock(setInterval(() => {
    //         setTimeBlock(prevTime => prevTime + 1)
    //     }, 1000))
    // }


    useEffect(() => {
        if (startBlock === 'start') {
            setTimeBlock(0)
            tick()
        }
        else if (startBlock === 'return') {
            tick()
        }
        startBlock === 'stop' && clearInterval(timerBlock)
    }, [startBlock])

    const clickTimer = (event) => {
        socket.emit('block event', { 'event': event, 'info': event === 'start' ? timeBlock : '' })
        // dispatch({ type: types.ShowAppLoading, payload: 'blockLoading' })
    }

    return (
        <div className="block-info">
            <div className="block-clock">
                <p className="description">С начала блока:</p>
                <p className="timer">{format(timeBlock)}</p>
            </div>
            <div className="block-buttons">
                <button className="btn btn-success" onClick={() => clickTimer('start')}> <img src={play} alt="play" /></button>
                <button className="btn btn-danger" onClick={() => clickTimer('pause')}> <img src={pause} alt="pause" /> </button>
                <button className="btn btn-secondary" onClick={() => clickTimer('restart')}> <img src={restart} alt="restart" /></button>
            </div>
        </div>
    )
}
