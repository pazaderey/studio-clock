import { handlers } from "./actions";
import { initialState } from "./initialState";

export const reducer = (state = initialState, action) => {
  const handler = handlers[action.type] || handlers['DEFAULT'];
  return handler(state, action);
}