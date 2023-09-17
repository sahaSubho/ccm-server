const Redis = require('redis')
const { redis } = require('./config')

const url = `redis://${redis.host}:${redis.port}`
const client = Redis.createClient({ url })
if (redis.usePassword.toUpperCase() === 'YES') {
  client.auth(redis.password)
}

;(async () => {
  await client.connect()
})()

console.log('Connecting to the Redis', client)

client.on('ready', () => {
  console.log('Connected!')
})

client.on('error', (err) => {
  console.error(err)
})
module.exports = client
