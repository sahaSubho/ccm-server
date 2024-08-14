const Redis = require('redis')
const { redis } = require('./config')

const client = Redis.createClient({
  url: `redis://${redis.host}:${redis.port}`,
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
