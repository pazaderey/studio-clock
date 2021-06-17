import React from 'react';
import { useSelector } from 'react-redux';
import error from '../img/Error.gif'


export const ErrorBlock = () => {
    const errorText = useSelector(state => state.errorText)
    return (
        <div className="error-block">
            <img src={error} alt="" />
            <h1 className="error-title">Ошибка с сервером</h1>
            <p className="error-description">
                {!!errorText ? errorText : "Проверьте работоспособность сервера и OBS."} 
                <br />
                Попробуйте переподключиться к obs-websocket, заполнив форму ниже, или перезагрузить страницу.
            </p>
        </div>
    )
}