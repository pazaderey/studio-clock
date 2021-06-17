import { types } from "./types"

export const handlers = {
    [types.DEFAULT]: (state) => {
        return {...state}
    },
    [types.SetSocket]: (state, action) => {
        return {...state, socket: action.payload}
    },
    [types.ShowAppLoading]: (state ) => {
        return {...state, loading: true}
    },
    [types.HideAppLoading]: (state ) => {
        return {...state, loading: false}
    },
    [types.ShowError]: (state, action ) => {
        return {...state, error: true, errorText: action.payload}
    },
    [types.HideError]: (state ) => {
        return {...state, error: false}
    },
}