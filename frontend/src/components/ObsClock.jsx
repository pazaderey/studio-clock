import React, { useEffect, useState, useCallback, useContext } from 'react';
import { BlockClock } from './BlockClock';
import clock from '../img/stopwatch.png'
import { WebSocketContext } from './WebSocket';
import { useDispatch } from 'react-redux';
import { types } from '../redux/types';

export const ObsClock = () => {
    const { socket } = useContext(WebSocketContext);
    const dispatch = useDispatch()

    const [start, setStart] = useState(false)
    const [cont, setCont] = useState(false)
    const [block, setBlock] = useState(false)
    const [timer, setTimer] = useState(null)
    const [time, setTime] = useState(0)

    // const SetBlockCall = useCallback(() => setBlock(flag), [setBlock])
    // const addTime = useCallback(() => setTime(prev => prev + 1), [setTime])

    const continueTime = (cont, strTime) => {
        let sec = 0
        if (strTime)
            sec = (+strTime[2].split('.')[0]) + ((+strTime[1]) * 60) + ((+strTime[0]) * 60 * 60)
        setCont(cont)
        setStart(cont)
        setTime(sec)
        return sec
    }

    //   useEffect(() => {
    //    console.log(cont)
    //   }, [cont])

    useEffect(() => {
        socket.on('my response', data => {
            data = JSON.parse(data)
            switch (data.type) {

                case 'connect':
                    if (data.stream) {
                        continueTime(true, data.streamTime.split(':'))
                    }
                    else if (data.recording){
                        continueTime(!data.recordPause, data.recordTime.split(':'))
                    }
                    else break
                    break;

                case 'record':
                    if (data.event === 'start') {
                        !data.stream && setStart(true)
                    }
                    else if (data.event === 'paused') {
                        setStart(false)
                        setCont(false)
                    }
                    else if (data.event === 'resume') {
                        continueTime(true, data.time['rec-timecode'].split(':'))
                    }
                    else {
                        if (!data.stream) {
                            setCont(false)
                            setStart(false)
                        }
                    }
                    break;

                case 'stream':
                    if (data.event === 'start') {
                        setTime(0)
                        setCont(false)
                        setStart(true)
                    }
                    else {
                        setCont(false)
                        setStart(false)
                    }
                    break;

                case 'error':
                    dispatch({type: types.ShowError, payload: data.mes})

                default:
                    break;
            }
        })

        return () => socket.off('my response')
    }, [])

    // useEffect(() => console.log(time), [time])

    const format = useCallback(time => {
        const hours = Math.floor(time / 60 / 60)
        const minutes = Math.floor(time / 60)
        const seconds = time % 60

        const formatted = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');

        return formatted;

    }, [time])

    useEffect(() => {
        if (start) {
            !cont && setTime(0)
            tick(setTimer, setTime)
        }
        !start && clearInterval(timer)
    }, [start])



    const tick = useCallback((setTimerCall, setTimeCall) => {
        setTimerCall(setInterval(() => {
            //addTime()
            setTimeCall(prevTime => prevTime + 1)
        }, 1000))
    }, [setTimer, setTime, time])

    //  useEffect(() => {console.log('tick')}, [tick])

    return (
        <section className="obs-clock">
            <div className={"streaming-container " + (!block ? 'only-stream' : '')}>
                <p className="description">С начала эфира:</p>
                <p className={"timer " + (start ? 'playing-stream' : '')}>{format(time)}</p>
            </div>
            <div className="clockIcon">
                <img onClick={() => setBlock(!block)} src={clock} alt="" />
            </div>
            <div className={`block-container ${block}-block`} >
                <BlockClock format={format} socket={socket} setBlock={setBlock} />
            </div>
        </section>
    )
}
