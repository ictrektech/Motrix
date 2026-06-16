export const remote = (input, options, callback) => {
  const done = typeof options === 'function' ? options : callback
  if (done) {
    done(new Error('Torrent file preview is not available in web mode.'))
  }
}

export default {
  remote
}
