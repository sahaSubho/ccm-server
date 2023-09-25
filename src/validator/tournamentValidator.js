const Joi = require('joi')
const httpStatus = require('http-status')
const ApiError = require('../helper/ApiError')

// schema options
const options = {
  abortEarly: false, // include all errors
  allowUnknown: true, // ignore unknown props
  stripUnknown: true, // remove unknown props
}

class TournamentValidator {
  async createValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      name: Joi.string().required(),
      organizer: Joi.string().required(),
      federation: Joi.string().required(),
      director: Joi.string(),
      arbiter: Joi.string(),
      rating: Joi.number().default(0),
      rounds: Joi.number().required(),
      address: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      category: Joi.string().required(),
      time_control: Joi.string().required(),
      entry_fee: Joi.array()
        .items(
          Joi.object({
            category: Joi.string(),
            fee: Joi.number(),
          })
        )
        .min(1)
        .required(),
      tournament_type: Joi.string().default('OTB'),
      start_date: Joi.date().required(),
      end_date: Joi.date().greater(Joi.ref('start_date')).required(),
    })

    const fileSchema = Joi.object({
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string().required(),
      destination: Joi.string().required(),
      filename: Joi.string().required(),
      path: Joi.string().required(),
      size: Joi.number().required(),
    })

    const fileResult = Joi.array().items(fileSchema).validate(req.files)

    // validate request body against schema(
    const body = { ...req.body, entry_fee: JSON.parse(req.body.entry_fee) }
    const { error, value } = schema.validate(body, options)

    if (error || fileResult.error) {
      // on fail return comma separated errors
      const errorMessage = (error || fileResult.error).details
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
  async pairingValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      round: Joi.number().greater(0).required(),
      tournamentId: Joi.number().required(),
    })

    // validate request body against schema
    const { error, value } = schema.validate(req.query, options)

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
      req.query = value
      return next()
    }
  }
  async prizeConfigValidator(req, res, next) {
    // TODO: update with the appropriate validation logic
    return next()
  }

  async uploadValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      body: Joi.object({
        round: Joi.number().required(),
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

  async createPrizeValidator(req, res, next) {
    // create schema object
    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('age', 'rating').required(),
        gender: Joi.string().valid('open', 'boys', 'girls').required(),
        operator: Joi.number().valid(0, 1, 2).required(),
        age: Joi.when('type', { is: 'age', then: Joi.required() }),
        rating: Joi.when('type', { is: 'rating', then: Joi.required() }),
      })
    )

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

module.exports = TournamentValidator
