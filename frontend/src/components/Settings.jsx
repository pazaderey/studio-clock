import React from 'react';
import axios from "axios"
import { types } from '../redux/types';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';

export const Settings = () => {

    const dispatch = useDispatch()
    const loading = useSelector(state => state.loading)
    const { register, handleSubmit, formState: { errors } } = useForm()

    const sendData = async (data) => {
        dispatch({ type: types.ShowAppLoading })

        axios.post(`/reconnect`, data)
            .then(res => {
                if (res.data.status === 'error') {
                    dispatch({ type: types.ShowError, payload: res.data.description })
                }
                else {
                    dispatch({ type: types.HideError })
                }
            })
            .catch(err => dispatch({ type: types.ShowError, payload: `Не установлена связь с ${err.config.url}` }))
            .finally(() => dispatch({ type: types.HideAppLoading }))
    }

    const handleKeypress = (e) => {
        e.charCode === 13 && handleSubmit(data => sendData(data))()
    }

    return (
        <div className="settings">
            <div className={`settings-block`}>
                <label className="form-label" htmlFor="ip-input ">IP-adress OSB<span> *</span></label>
                <input {...register("ip", { required: "Это поле обязательно для заполнения" })} defaultValue="" name="ip" className={"form-control " + (errors.ip ? "is-invalid" : `all-invalid-${!!Object.keys(errors).length}`)} id="ip-input" />
                {errors.ip && <span className="input-error text-danger">{errors.ip.message}</span>}
            </div>
            <div className={`settings-block`}>
                <label className="form-label" htmlFor="port-input">Port OSB<span> *</span></label>
                <input {...register("port", { required: "Это поле обязательно для заполнения" })} onKeyPress={e => handleKeypress(e)} defaultValue="" name="port" className={"form-control " + (errors.port ? "is-invalid" : `all-invalid-${!!Object.keys(errors).length}`)} id="port-input" />
                {errors.port && <span className="input-error text-danger">{errors.port.message}</span>}
            </div>
            <div className={`settings-block all-invalid-${!!Object.keys(errors).length}`}>
                <label className="form-label" htmlFor="password-input">Password OSB</label>
                <input type="password" {...register("password")} onKeyPress={e => handleKeypress(e)} defaultValue="" name="ip" className="form-control" id="password-input" />                
            </div>
            <div className={`settings-block all-invalid-${!!Object.keys(errors).length}`}>
                <button className="btn btn-primary" disabled={loading} onClick={handleSubmit(data => sendData(data))}>Send</button>
            </div>
        </div>
    )
}
