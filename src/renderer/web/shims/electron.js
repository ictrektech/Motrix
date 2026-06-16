export const ipcRenderer = {
  invoke: () => Promise.resolve({}),
  send: () => {},
  on: () => {},
  removeAllListeners: () => {}
}

export const shell = {
  openExternal: (url) => window.open(url, '_blank', 'noopener,noreferrer')
}
