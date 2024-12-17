/* eslint-disable no-param-reassign */
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
  static uploadValidator(req, res, next) {
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

  static addPlayer(req, res, next) {
    const playerSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().required(),
      gender: Joi.string().valid('M', 'F').required(),
      mobile: Joi.string().allow(null).default(''),
      upi_id: Joi.string().allow(null).default(''),
      fide_id: Joi.number(),
      rating: Joi.number(),
    })
    // create schema object
    const schema = Joi.object({
      params: Joi.object({
        id: Joi.number().required(),
      }),
      body: Joi.alternatives().try(
        playerSchema,
        Joi.array().items(playerSchema)
      ),
    })

    // validate request body against schema
    const { error, value } = schema.validate(req, options)
    console.log('req', req.body, error)

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

  static withDrawPlayer(req, res, next) {
    // create schema object
    const schema = Joi.object({
      is_withdrawn: Joi.bool().required(),
      tournamentId: Joi.number().required(),
      round: Joi.number().required(),
      id: Joi.number().required(),
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

  static distriubtePrizes(req, res, next) {
    // create schema object
    const schema = Joi.object({
      tournamentId: Joi.number().required(),
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

  static uploadCRValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      body: Joi.object({
        tournamentId: Joi.number().required(),
        type: Joi.string().valid('players', 'pairings', 'team').required(),
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

  static searchFidePlayers(req, res, next) {
    // create schema object
    const schema = Joi.object({
      fideId: Joi.number(),
      name: Joi.string().allow(''),
      rating: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
      }),
      rapid_rating: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
      }),
      blitz_rating: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
      }),
      year: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
      }),
      federation: Joi.string(),
      gender: Joi.string().valid('M', 'F'),
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
