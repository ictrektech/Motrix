export const resolve = (...parts) => {
  return parts
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
}

export const join = resolve

export const dirname = (path = '') => {
  const normalized = resolve(path)
  const index = normalized.lastIndexOf('/')
  return index <= 0 ? '/' : normalized.slice(0, index)
}

export const basename = (path = '') => {
  const normalized = resolve(path)
  const index = normalized.lastIndexOf('/')
  return index < 0 ? normalized : normalized.slice(index + 1)
}
