export const app = {
  getVersion: () => ''
}

export const dialog = {
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  showMessageBox: () => Promise.resolve({ response: 0 })
}

export const nativeTheme = {
  get shouldUseDarkColors () {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  }
}

export const shell = {
  showItemInFolder: () => {},
  openPath: () => Promise.resolve(''),
  trashItem: () => Promise.resolve(true)
}

export const webContents = {
  getAllWebContents: () => []
}

export const getCurrentWindow = () => ({
  minimize: () => {},
  maximize: () => {},
  unmaximize: () => {},
  isMaximized: () => false,
  close: () => {}
})
