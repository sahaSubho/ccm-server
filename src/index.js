/* eslint-disable global-require */
;(async () => {
  console.log('NODE_ENV : ', process.env.NODE_ENV)
  console.log('ENV : ', process.env.ENV)

  if (
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'preprod'
  ) {
    console.log('Retrieving secret from secrets manager')

    await require('./config/getEnv')
  }
  const app = require('./app')
  const config = require('./config/config')

  // console.log('Hello Node-Express-Mysql with Sequelize Boilerplate!!');
  require('./cronJobs')
  // eslint-disable-next-line import/order
  const http = require('http')
  // socket initialization
  const server = http.createServer(app)
  // eslint-disable-next-line import/order
  // const io = require('socket.io')(server, { cors: { origin: '*' } })

  // global.io = io
  // require('./config/rootSocket')(io)

  server.listen(config.port, () => {
    console.log('SERVER')
    console.log(`Listening to port ${config.port}`)
  })
})()
