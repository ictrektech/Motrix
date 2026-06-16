import { ipcRenderer } from 'electron'
import is from 'electron-is'
import { isEmpty, clone } from 'lodash'
import { Aria2 } from '@shared/aria2'
import {
  separateConfig,
  compactUndefined,
  formatOptionsForEngine,
  mergeTaskResult,
  changeKeysToCamelCase,
  changeKeysToKebabCase
} from '@shared/utils'
import {
  APP_RUN_MODE,
  APP_THEME,
  ENGINE_MAX_CONNECTION_PER_SERVER,
  ENGINE_RPC_HOST,
  ENGINE_RPC_PORT
} from '@shared/constants'

const WEB_CONFIG_STORAGE_KEY = 'motrix-web-config'

const getRpcErrorMessage = (error) => {
  if (!error) {
    return ''
  }

  if (error.message) {
    return error.message
  }

  if (error.faultString) {
    return error.faultString
  }

  return ''
}

const assertMulticallResult = (data = []) => {
  const errors = data
    .filter(item => item && !Array.isArray(item) && getRpcErrorMessage(item))
    .map(getRpcErrorMessage)

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  return data
}

const defaultWebConfig = () => ({
  'auto-check-update': false,
  'auto-hide-window': false,
  'auto-sync-tracker': false,
  'enable-upnp': false,
  'engine-max-connection-per-server': ENGINE_MAX_CONNECTION_PER_SERVER,
  'favorite-directories': [],
  'hide-app-menu': false,
  'history-directories': [],
  'keep-seeding': false,
  'keep-window-state': false,
  'last-check-update-time': 0,
  'last-sync-tracker-time': 0,
  locale: navigator.language || 'en-US',
  'log-level': 'warn',
  'new-task-show-downloading': true,
  'no-confirm-before-delete-task': false,
  'open-at-login': false,
  protocols: { magnet: true, thunder: false },
  proxy: {
    enable: false,
    server: '',
    bypass: '',
    scope: []
  },
  'resume-all-when-app-launched': false,
  'run-mode': APP_RUN_MODE.STANDARD,
  'show-progress-bar': false,
  'task-notification': false,
  theme: APP_THEME.AUTO,
  'tracker-source': [],
  'tray-theme': APP_THEME.AUTO,
  'tray-speedometer': false,
  'update-channel': 'latest',
  'window-state': {},
  'allow-overwrite': false,
  'auto-file-renaming': true,
  'bt-force-encryption': false,
  'bt-load-saved-metadata': true,
  'bt-save-metadata': true,
  continue: true,
  dir: '/downloads',
  'follow-metalink': true,
  'follow-torrent': true,
  'max-concurrent-downloads': 5,
  'max-connection-per-server': ENGINE_MAX_CONNECTION_PER_SERVER,
  'max-download-limit': 0,
  'max-overall-download-limit': 0,
  'max-overall-upload-limit': 0,
  'pause-metadata': false,
  pause: true,
  'rpc-listen-port': ENGINE_RPC_PORT,
  'rpc-secret': '',
  'seed-ratio': 2,
  'seed-time': 2880,
  split: ENGINE_MAX_CONNECTION_PER_SERVER
})

export default class Api {
  constructor (options = {}) {
    this.options = options

    this.init()
  }

  async init () {
    this.config = await this.loadConfig()

    this.client = this.initClient()
    this.client.open()
  }

  loadConfigFromLocalStorage () {
    const defaults = defaultWebConfig()
    const stored = window.localStorage.getItem(WEB_CONFIG_STORAGE_KEY)
    if (!stored) {
      return defaults
    }

    try {
      return { ...defaults, ...JSON.parse(stored) }
    } catch (err) {
      console.warn('[Motrix] load web config fail:', err)
      return defaults
    }
  }

  async loadConfigFromNativeStore () {
    const result = await ipcRenderer.invoke('get-app-config')
    return result
  }

  async loadConfig () {
    let result = is.renderer()
      ? await this.loadConfigFromNativeStore()
      : this.loadConfigFromLocalStorage()

    result = changeKeysToCamelCase(result)
    return result
  }

  initClient () {
    const {
      rpcListenPort: port,
      rpcSecret: secret
    } = this.config
    const isWeb = !is.renderer()
    const host = is.renderer()
      ? ENGINE_RPC_HOST
      : (window.location.hostname || ENGINE_RPC_HOST)
    const rpcPort = isWeb
      ? Number(window.location.port || (window.location.protocol === 'https:' ? 443 : 80))
      : port
    return new Aria2({
      host,
      port: rpcPort,
      secret,
      secure: isWeb && window.location.protocol === 'https:'
    })
  }

  closeClient () {
    this.client.close()
      .then(() => {
        this.client = null
      })
      .catch(err => {
        console.log('engine client close fail', err)
      })
  }

  fetchPreference () {
    return new Promise((resolve) => {
      this.config = this.loadConfig()
      resolve(this.config)
    })
  }

  savePreference (params = {}) {
    const kebabParams = changeKeysToKebabCase(params)
    if (is.renderer()) {
      return this.savePreferenceToNativeStore(kebabParams)
    } else {
      return this.savePreferenceToLocalStorage(kebabParams)
    }
  }

  savePreferenceToLocalStorage (params = {}) {
    const current = this.loadConfigFromLocalStorage()
    const next = { ...current, ...params }
    window.localStorage.setItem(WEB_CONFIG_STORAGE_KEY, JSON.stringify(next))
    this.config = changeKeysToCamelCase(next)
    this.updateActiveTaskOption(params)
  }

  savePreferenceToNativeStore (params = {}) {
    const { user, system, others } = separateConfig(params)
    const config = {}

    if (!isEmpty(user)) {
      console.info('[Motrix] save user config: ', user)
      config.user = user
    }

    if (!isEmpty(system)) {
      console.info('[Motrix] save system config: ', system)
      config.system = system
      this.updateActiveTaskOption(system)
    }

    if (!isEmpty(others)) {
      console.info('[Motrix] save config found illegal key: ', others)
    }

    ipcRenderer.send('command', 'application:save-preference', config)
  }

  getVersion () {
    return this.client.call('getVersion')
  }

  changeGlobalOption (options) {
    const args = formatOptionsForEngine(options)

    return this.client.call('changeGlobalOption', args)
  }

  getGlobalOption () {
    return new Promise((resolve) => {
      this.client.call('getGlobalOption')
        .then((data) => {
          resolve(changeKeysToCamelCase(data))
        })
    })
  }

  getOption (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])

    return new Promise((resolve) => {
      this.client.call('getOption', ...args)
        .then((data) => {
          resolve(changeKeysToCamelCase(data))
        })
    })
  }

  updateActiveTaskOption (options) {
    this.fetchTaskList({ type: 'active' })
      .then((data) => {
        if (isEmpty(data)) {
          return
        }

        const gids = data.map((task) => task.gid)
        this.batchChangeOption({ gids, options })
      })
  }

  changeOption (params = {}) {
    const { gid, options = {} } = params

    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([gid, engineOptions])

    return this.client.call('changeOption', ...args)
  }

  getGlobalStat () {
    return this.client.call('getGlobalStat')
  }

  addUri (params) {
    const {
      uris,
      outs,
      options
    } = params
    const tasks = uris.map((uri, index) => {
      const engineOptions = formatOptionsForEngine(options)
      if (outs && outs[index]) {
        engineOptions.out = outs[index]
      }
      const args = compactUndefined([[uri], engineOptions])
      return ['aria2.addUri', ...args]
    })
    return this.client.multicall(tasks).then(assertMulticallResult)
  }

  addTorrent (params) {
    const {
      torrent,
      options
    } = params
    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([torrent, [], engineOptions])
    return this.client.call('addTorrent', ...args)
  }

  addMetalink (params) {
    const {
      metalink,
      options
    } = params
    const engineOptions = formatOptionsForEngine(options)
    const args = compactUndefined([metalink, engineOptions])
    return this.client.call('addMetalink', ...args)
  }

  fetchDownloadingTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const activeArgs = compactUndefined([keys])
    const waitingArgs = compactUndefined([offset, num, keys])
    return new Promise((resolve, reject) => {
      this.client.multicall([
        ['aria2.tellActive', ...activeArgs],
        ['aria2.tellWaiting', ...waitingArgs]
      ]).then((data) => {
        console.log('[Motrix] fetch downloading task list data:', data)
        const result = mergeTaskResult(data)
        resolve(result)
      }).catch((err) => {
        console.log('[Motrix] fetch downloading task list fail:', err)
        reject(err)
      })
    })
  }

  fetchWaitingTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const args = compactUndefined([offset, num, keys])
    return this.client.call('tellWaiting', ...args)
  }

  fetchStoppedTaskList (params = {}) {
    const { offset = 0, num = 20, keys } = params
    const args = compactUndefined([offset, num, keys])
    return this.client.call('tellStopped', ...args)
  }

  fetchActiveTaskList (params = {}) {
    const { keys } = params
    const args = compactUndefined([keys])
    return this.client.call('tellActive', ...args)
  }

  fetchTaskList (params = {}) {
    const { type } = params
    switch (type) {
    case 'active':
      return this.fetchDownloadingTaskList(params)
    case 'waiting':
      return this.fetchWaitingTaskList(params)
    case 'stopped':
      return this.fetchStoppedTaskList(params)
    default:
      return this.fetchDownloadingTaskList(params)
    }
  }

  fetchTaskItem (params = {}) {
    const { gid, keys } = params
    const args = compactUndefined([gid, keys])
    return this.client.call('tellStatus', ...args)
  }

  fetchTaskItemWithPeers (params = {}) {
    const { gid, keys } = params
    const statusArgs = compactUndefined([gid, keys])
    const peersArgs = compactUndefined([gid])
    return new Promise((resolve, reject) => {
      this.client.multicall([
        ['aria2.tellStatus', ...statusArgs],
        ['aria2.getPeers', ...peersArgs]
      ]).then((data) => {
        console.log('[Motrix] fetchTaskItemWithPeers:', data)
        const result = data[0] && data[0][0]
        const peers = data[1] && data[1][0]
        result.peers = peers || []
        console.log('[Motrix] fetchTaskItemWithPeers.result:', result)
        console.log('[Motrix] fetchTaskItemWithPeers.peers:', peers)

        resolve(result)
      }).catch((err) => {
        console.log('[Motrix] fetch downloading task list fail:', err)
        reject(err)
      })
    })
  }

  fetchTaskItemPeers (params = {}) {
    const { gid, keys } = params
    const args = compactUndefined([gid, keys])
    return this.client.call('getPeers', ...args)
  }

  pauseTask (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('pause', ...args)
  }

  pauseAllTask (params = {}) {
    return this.client.call('pauseAll')
  }

  forcePauseTask (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('forcePause', ...args)
  }

  forcePauseAllTask (params = {}) {
    return this.client.call('forcePauseAll')
  }

  resumeTask (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('unpause', ...args)
  }

  resumeAllTask (params = {}) {
    return this.client.call('unpauseAll')
  }

  removeTask (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('remove', ...args)
  }

  forceRemoveTask (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('forceRemove', ...args)
  }

  saveSession (params = {}) {
    return this.client.call('saveSession')
  }

  purgeTaskRecord (params = {}) {
    return this.client.call('purgeDownloadResult')
  }

  removeTaskRecord (params = {}) {
    const { gid } = params
    const args = compactUndefined([gid])
    return this.client.call('removeDownloadResult', ...args)
  }

  multicall (method, params = {}) {
    let { gids, options = {} } = params
    options = formatOptionsForEngine(options)

    const data = gids.map((gid, index) => {
      const _options = clone(options)
      const args = compactUndefined([gid, _options])
      return [method, ...args]
    })
    return this.client.multicall(data)
  }

  batchChangeOption (params = {}) {
    return this.multicall('aria2.changeOption', params)
  }

  batchRemoveTask (params = {}) {
    return this.multicall('aria2.remove', params)
  }

  batchResumeTask (params = {}) {
    return this.multicall('aria2.unpause', params)
  }

  batchPauseTask (params = {}) {
    return this.multicall('aria2.pause', params)
  }

  batchForcePauseTask (params = {}) {
    return this.multicall('aria2.forcePause', params)
  }
}
