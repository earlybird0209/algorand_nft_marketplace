export const reducer = (state, action) => {
  switch (action.type) {
    case "TOGGLE": {
      return { ...state, bool: !state.bool }
    }
    case "USER_LOGIN": {
      return { ...state, user: action.payload }
    }
    case "USER_WALLET": {
      return { ...state, user: { ...state?.user, ...action.payload } }
    }
    case "USER_ACCOUNT": {
      return { ...state, user: { ...state?.user, ...action.payload } }
    }
    case "USER_BY_EMAIL": {
      return { ...state, user: { ...state?.user, ...action.payload } }
    }

  }
}