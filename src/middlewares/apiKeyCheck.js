const httpStatus = require('http-status')
const ApiError = require('../helper/ApiError')
const config = require('../config/config')

const check = async (req, res, next) => {
  if (!req.headers['api-key']) {
    return next(new ApiError(httpStatus.BAD_REQUEST, 'Please provide API-KEY'))
  }
  if (req.headers['api-key'] && req.headers['api-key'] !== config.apiKey) {
    return next(
      new ApiError(httpStatus.BAD_REQUEST, 'Please provide a valid API-KEY')
    )
  }
  return next()
}

module.exports = check
