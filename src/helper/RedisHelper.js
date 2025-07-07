class RedisHelper {
  constructor(redisClient) {
    this.redisClient = redisClient
  }

  /**
   * Set Value
   * @param {String} key
   * @param {String/JSON} value
   * @returns {String/Boolean}
   */
  set = async (key, value) => {
    try {
      if (typeof value === 'JSON') {
        value = JSON.stringify(value)
      }
      return await this.redisClient.set(key, value)
    } catch (e) {
      return false
    }
  }

  /**
   * Set Value with Expiry
   * @param {String} key
   * @param {Integer} seconds
   * @param {String/JSON} value
   * @returns {String/boolean}
   */
  setEx = async (key, seconds, value) => {
    try {
      if (typeof value === 'JSON') {
        value = JSON.stringify(value)
      }
      return await this.redisClient.setEx(key, seconds, value)
    } catch (e) {
      return false
    }
  }

  /**
   * Get Value
   * @param {String} key
   * @returns {String>}
   */
  get = async (key) => {
    try {
      return await this.redisClient.get(key)
    } catch (e) {
      return null
    }
  }

  /**
   * Delete Value
   * @param {String} key
   * @returns {Boolean}
   */
  del = async (key) => {
    try {
      return await this.redisClient.del(key)
    } catch (e) {
      return false
    }
  }

  /**   * Push value to a list
   * @param {String} key
   * @param {String/JSON} value
   * @returns {Integer/Boolean}
   */
  rPush = async (key, value) => {
    try {
      return await this.redisClient.rPush(key, value)
    } catch (e) {
      return false
    }
  }

  /**   * Get values from a list
   * @param {String} key
   * @param {Integer} start
   * @param {Integer} end
   * @returns {Array/Boolean}
   */
  lRange = async (key, start, end) => {
    try {
      return await this.redisClient.lRange(key, start, end)
    } catch (e) {
      console.error(`Error in lRange: ${e.message}`)
      return false
    }
  }

  /**   * Get length of a list
   * @param {String} key
   * @returns {Integer/Boolean}
   */
  lLen = async (key) => {
    try {
      return await this.redisClient.lLen(key)
    } catch (e) {
      return false
    }
  }

  /**   * Set expiry for a key
   * @param {String} key
   * @param {Integer} seconds
   * @returns {Boolean}
   */
  expire = async (key, seconds) => {
    try {
      return await this.redisClient.expire(key, seconds)
    } catch (e) {
      return false
    }
  }

  scanStream = async (key) => {
    try {
      await this.redisClient.scanStream({
        // only returns keys following the pattern of "key"
        match: key,
        // returns approximately 100 elements per call
        count: 100,
      })
    } catch (e) {
      return false
    }
  }
}

module.exports = RedisHelper
