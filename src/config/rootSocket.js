const rootSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('New connection\n')
    socket.on('disconnect', () => {
      console.log('disconnected')
    })
  })
  return io
}
module.exports = rootSocket
