const Joi = require('joi')
const httpStatus = require('http-status')
const ApiError = require('../helper/ApiError')

// schema options
const options = {
  abortEarly: false, // include all errors
  allowUnknown: true, // ignore unknown props
  stripUnknown: true, // remove unknown props
}

class PlayerValidator {
  async uploadValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      body: Joi.object({
        tournamentId: Joi.number().required(),
      }),
      file: Joi.object({
        fieldname: Joi.string().required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string().required(),
        destination: Joi.string().required(),
        filename: Joi.string().required(),
        path: Joi.string().required(),
        size: Joi.number().required(),
      }),
    })

    // validate request body against schema
    const { error, value } = schema.validate(req, options)

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message
        })
        .join(', ')
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage))
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req = value
      return next()
    }
  }

  async addPlayer(req, res, next) {
    // create schema object
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required(),
      }),
      body: Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
        gender: Joi.string().valid('M', 'F').required(),
        mobile: Joi.string(),
        upi_id: Joi.string(),
        fide_id: Joi.number(),
        rating: Joi.number(),
      }),
    })

    // validate request body against schema
    const { error, value } = schema.validate(req, options)

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message
        })
        .join(', ')
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage))
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req = value
      return next()
    }
  }

  async withDrawPlayer(req, res, next) {
    // create schema object
    const schema = Joi.object({
      is_withdrawn: Joi.bool().required(),
      tournamentId: Joi.number().required(),
      round: Joi.number().required(),
      uuid: Joi.string().required(),
    })

    // validate request body against schema
    const { error, value } = schema.validate(req.body, options)

    if (error) {
      // on fail return comma separated errors
      const errorMessage = error.details
        .map((details) => {
          return details.message
        })
        .join(', ')
      next(new ApiError(httpStatus.BAD_REQUEST, errorMessage))
    } else {
      // on success replace req.body with validated value and trigger next middleware function
      req.body = value
      return next()
    }
  }
}

module.exports = PlayerValidator
