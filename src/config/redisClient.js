const Redis = require('redis')
const RedisCluster = require('ioredis')
const { redis, cluster_mode_enabled } = require('./config')

let client
if (cluster_mode_enabled) {
  client = new RedisCluster.Cluster([
    {
      port: redis.port,
      host: redis.host,
      password: redis.password,
    },
    {
      port: redis.port2,
      host: redis.host2,
      password: redis.password2,
    },
  ])
} else {
  client = Redis.createClient({
    url: `redis://${redis.host}:${redis.port}`,
  })

  // if (env === 'production') {
  ;(async () => {
    await client.connect()
  })()
}

client.on('ready', () => {
  console.log('Redis Connected!')
})

client.on('error', (err) => {
  console.error(err)
})
// }
module.exports = client
