import axios from "axios";
import React, { useCallback, useState, } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { types } from "../redux/types";

export const Settings = () => {
  const [mixer, setMixer] = useState("OBS");
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.loading);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const changeMixer = useCallback(() => mixer === "OBS" ? "vMix" : "OBS", [mixer]);

  const sendData = useCallback(async (data) => {
    dispatch({ type: types.ShowAppLoading });

    axios
      .post(`/reconnect/${mixer.toLowerCase()}`, data)
      .then((res) => {
        if (res.data.status === "error") {
          dispatch({ type: types.ShowError, payload: res.data.description });
        }
      })
      .catch((err) =>
        dispatch({
          type: types.ShowError,
          payload: `Не установлена связь с ${err.config.url}`,
        })
      )
      .finally(() => dispatch({ type: types.HideAppLoading }));
  }, [mixer]);

  const handleKeypress = (e) => {
    e.charCode === 13 && handleSubmit((data) => sendData(data))();
  };

  return (
    <div className="settings">
      <div className="settings-mixer">
        <div className={`settings-block`}>
          <label className="form-label" htmlFor="ip-input ">
            {mixer} IP адрес<span> *</span>
          </label>
          <input
            {...register("ip", {
              required: "Это поле обязательно для заполнения",
            })}
            defaultValue=""
            name="ip"
            className={
              "form-control " +
              (errors.ip
                ? "is-invalid"
                : `all-invalid-${!!Object.keys(errors).length}`)
            }
            id="ip-input"
          />
          {errors.ip && (
            <span className="input-error text-danger">{errors.ip.message}</span>
          )}
        </div>
        <div className={`settings-block`}>
          <label className="form-label" htmlFor="port-input">
            {mixer} порт<span> *</span>
          </label>
          <input
            {...register("port", {
              required: "Это поле обязательно для заполнения",
            })}
            onKeyPress={(e) => handleKeypress(e)}
            defaultValue=""
            name="port"
            className={
              "form-control " +
              (errors.port
                ? "is-invalid"
                : `all-invalid-${!!Object.keys(errors).length}`)
            }
            id="port-input"
          />
          {errors.port && (
            <span className="input-error text-danger">
              {errors.port.message}
            </span>
          )}
        </div>
        <div
          className={`settings-block all-invalid-${!!Object.keys(errors)
            .length}`}
          hidden={mixer === "vMix"}
        >
          <label className="form-label" htmlFor="password-input">
            OBS пароль
          </label>
          <input
            type="password"
            {...register("password")}
            onKeyPress={(e) => handleKeypress(e)}
            defaultValue=""
            name="password"
            className="form-control"
            id="password-input"
          />
        </div>
        <div
          className={`settings-block all-invalid-${!!Object.keys(errors)
            .length}`}
        >
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={handleSubmit((data) => sendData(data))}
          >
            Подключиться
          </button>
        </div>
      </div>

      <div className="block-info">
        <button
          className="btn btn-primary api-btn"
          onClick={() => (window.location.href = "/api")}
        >
          Посмотреть API
        </button>

        <button
          className="btn btn-primary api-btn"
          onClick={() => setMixer(changeMixer)}
        >
          Подключиться к {changeMixer()}
        </button>
      </div>
    </div>
  );
};
