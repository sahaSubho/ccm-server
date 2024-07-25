const Redis = require('redis')
const { redis } = require('./config')

const client = Redis.createClient({
  host: redis.host, // e.g., '127.0.0.1'
  port: redis.port, // e.g., 6379
  password: redis.password,
})

// if (env === 'production') {
;(async () => {
  await client.connect()
})()

client.on('ready', () => {
  console.log('Redis Connected!')
})

client.on('error', (err) => {
  console.error(err)
})
// }
module.exports = client
