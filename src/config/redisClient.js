const Redis = require('redis')
const { redis, env } = require('./config')

const url = `redis://${redis.host}:${redis.port}`
const client = Redis.createClient({ url })
if (redis.usePassword.toUpperCase() === 'YES') {
  client.auth(redis.password)
}

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
