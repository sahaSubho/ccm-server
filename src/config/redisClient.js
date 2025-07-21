const Redis = require('redis')
const RedisCluster = require('ioredis')
const { createPool } = require('generic-pool')
const { redis, cluster_mode_enabled } = require('./config')

let client

if (cluster_mode_enabled) {
  // Cluster mode (no pooling needed)
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

  client.on('ready', () => {
    console.log('Redis Cluster Connected!')
  })

  client.on('error', (err) => {
    console.error(err)
  })

  module.exports = client
} else {
  // Pooling mode for single Redis
  const factory = {
    create: async () => {
      const instance = Redis.createClient({
        url: `redis://${redis.host}:${redis.port}`,
      })
      await instance.connect()
      return instance
    },
    destroy: async (client) => {
      await client.quit()
    },
  }

  const pool = createPool(factory, {
    max: 20, // Adjust pool size as needed
    min: 10,
  })

  // Proxy to handle redis.<method>(...) via a pooled client
  const proxyHandler = {
    get(_, prop) {
      // Return an async function that acquires a client and runs the command
      return async (...args) => {
        const redisClient = await pool.acquire()
        try {
          return await redisClient[prop](...args)
        } finally {
          await pool.release(redisClient)
        }
      }
    },
  }

  client = new Proxy({}, proxyHandler)

  console.log('Testing Redis Pool Initialized!')
  module.exports = client
}


