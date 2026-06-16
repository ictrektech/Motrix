export const constants = {
  F_OK: 0
}

export const access = (path, mode, callback) => {
  if (typeof mode === 'function') {
    callback = mode
  }
  callback(new Error(`${path} is not available in web mode`))
}
