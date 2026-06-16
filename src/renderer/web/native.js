import { Message } from 'element-ui'

import {
  getFileNameFromFile,
  isMagnetTask
} from '@shared/utils'
import { APP_THEME } from '@shared/constants'

const resolvePath = (...parts) => {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
}

export const showItemInFolder = (fullPath, { errorMsg } = {}) => {
  if (!fullPath || !errorMsg) {
    return
  }
  Message.warning(errorMsg)
}

export const openItem = async () => ''

export const getTaskFullPath = (task) => {
  const { dir, files, bittorrent } = task
  let result = resolvePath(dir)

  if (isMagnetTask(task)) {
    return result
  }

  if (bittorrent && bittorrent.info && bittorrent.info.name) {
    return resolvePath(result, bittorrent.info.name)
  }

  const [file] = files
  const path = file.path ? resolvePath(file.path) : ''
  if (path) {
    return path
  }

  if (files && files.length === 1) {
    const fileName = getFileNameFromFile(file)
    if (fileName) {
      result = resolvePath(result, fileName)
    }
  }

  return result
}

export const moveTaskFilesToTrash = (task) => {
  if (isMagnetTask(task)) {
    return true
  }

  const { dir } = task
  const path = getTaskFullPath(task)
  if (!path || dir === path) {
    throw new Error('task.file-path-error')
  }

  return true
}

export const getSystemTheme = () => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return APP_THEME.DARK
  }
  return APP_THEME.LIGHT
}

export const delayDeleteTaskFiles = (task, delay) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(moveTaskFilesToTrash(task))
      } catch (err) {
        reject(err.message)
      }
    }, delay)
  })
}
