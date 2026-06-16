export class EventEmitter {
  constructor () {
    this.events = Object.create(null)
  }

  on (event, listener) {
    this.events[event] = this.events[event] || []
    this.events[event].push(listener)
    return this
  }

  addListener (event, listener) {
    return this.on(event, listener)
  }

  once (event, listener) {
    const wrapped = (...args) => {
      this.removeListener(event, wrapped)
      listener(...args)
    }
    return this.on(event, wrapped)
  }

  emit (event, ...args) {
    const listeners = this.events[event] || []
    listeners.slice().forEach(listener => listener(...args))
    return listeners.length > 0
  }

  removeListener (event, listener) {
    const listeners = this.events[event]
    if (!listeners) {
      return this
    }
    this.events[event] = listeners.filter(item => item !== listener)
    return this
  }

  off (event, listener) {
    return this.removeListener(event, listener)
  }
}
