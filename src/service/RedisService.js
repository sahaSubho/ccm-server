const redisClient = require('../config/redisClient')
const RedisHelper = require('../helper/RedisHelper')
const { jwt } = require('../config/config')

class RedisService {
  constructor() {
    this.redisHelper = new RedisHelper(redisClient)
  }

  /**
   * Create access and refresh tokens
   * @param {String} id
   * @param {Object} tokens
   * @returns {boolean}
   */
  createTokens = async (id, tokens) => {
    const accessKey = `access_token:${tokens.access.token}`
    const refreshKey = `refresh_token:${tokens.refresh.token}`
    const accessKeyExpires = jwt.accessExpirationMinutes * 60
    const refreshKeyExpires = jwt.refreshExpirationDays * 24 * 60 * 60
    await this.redisHelper.setEx(accessKey, accessKeyExpires, id)
    await this.redisHelper.setEx(refreshKey, refreshKeyExpires, id)
    return true
  }

  /**
   * Create access and refresh tokens
   * @param {String} token
   * @param {String} type [access_token,refresh_token]
   * @returns {boolean}
   */
  hasToken = async (token, type = 'access_token') => {
    const hasToken = await this.redisHelper.get(`${type}:${token}`)
    if (hasToken != null) {
      return true
    }
    return false
  }

  /**
   * Remove access and refresh tokens
   * @param {String} token
   * @param {String} type [access_token,refreshToken]
   * @returns {boolean}
   */
  removeToken = async (token, type = 'access_token') => {
    return this.redisHelper.del(`${type}:${token}`)
  }

  /**
   * Get user
   * @param {String} id
   * @returns {Object/Boolean}
   */
  getUser = async (id) => {
    const user = await this.redisHelper.get(`user:${id}`)
    if (user != null) {
      return JSON.parse(user)
    }
    return false
  }

  /**
   * Set user
   * @param {Object} user
   * @returns {boolean}
   */
  setUser = async (user) => {
    const setUser = await this.redisHelper.set(
      `user:${user?.id}`,
      JSON.stringify(user)
    )
    if (!setUser) {
      return true
    }
    return false
  }

  /**
   * Get Value
   * @param {String} key
   * @returns {String}
   */
  getValue = async (key) => {
    const value = await this.redisHelper.get(key)
    if (value != null) {
      return value
    }
    return false
  }

  /**
   * Set Value
   * @param {Object} key
   * @returns {boolean}
   */
  setValue = async (key, value) => {
    const setValue = await this.redisHelper.set(key, value)
    if (!setValue) {
      return true
    }
    return false
  }

  /**
   * Lock Key
   * @param {Object} key
   * @returns {boolean}
   */
  lock = async (key, value, config_data) => {
    return await this.redisHelper.lock(key, value, config_data)
  }

  /**
   * Set Value for Atomic
   * @param {Object} key
   * @returns {boolean}
   */
  setAtomicValue = async (key, value, ttl) => {
    const setValue = await this.redisHelper.setAtomic(key, value, ttl)
    if (!setValue) {
      return true
    }
    return false
  }

  /**
   * Set Value with expiry
   * @param {Object} key
   * @returns {boolean}
   */
  setValueWithExpiry = async (key, seconds, value) => {
    const setValue = await this.redisHelper.setEx(key, seconds, value)
    if (!setValue) {
      return true
    }
    return false
  }

  /**
   * Remove Key
   * @param {Object} key
   * @returns {boolean}
   */
  removeKey = async (key) => {
    return this.redisHelper.del(key)
  }

  rPush = async (key, value) => {
    return this.redisHelper.rPush(key, value)
  }

  lRange = async (key, start, end) => {
    return this.redisHelper.lRange(key, start, end)
  }

  lLen = async (key) => {
    return this.redisHelper.lLen(key)
  }

  lRem = async (key, count, value) => {
    return this.redisHelper.lRem(key, count, value)
  }

  expire = async (key, seconds = 86400) => {
    return this.redisHelper.expire(key, seconds)
  }

  hmSet = async (key, field, value) => {
    return this.redisHelper.hmSet(key, field, value)
  }

  hmGet = async (key, field) => {
    return this.redisHelper.hmGet(key, field)
  }

  hSet = async (key, field, value) => {
    return this.redisHelper.hSet(key, field, value)
  }

  hGet = async (key, field) => {
    return this.redisHelper.hGet(key, field)
  }

  hDel = async (key, field) => {
    return this.redisHelper.hDel(key, field)
  }
}

module.exports = RedisService
