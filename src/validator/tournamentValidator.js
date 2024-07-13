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
  static createValidator(req, res, next) {
    // create schema object
    let schema = Joi.object({
      name: Joi.string().required(),
      organizer: Joi.string().required(),
      federation: Joi.string().required(),
      director: Joi.string(),
      arbiter: Joi.string(),
      rating: Joi.number().default(0),
      rounds: Joi.number().required(),
      address: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().default('India'),
      category: Joi.string().default('Open'),
      time_control: Joi.string().required(),
      entry_fee: Joi.any().required(),
      tournament_type: Joi.string().default('OTB'),
      reporting_time: Joi.string(),
      meeting_time: Joi.string(),
      stakeholders_mobile_number: Joi.string().required(),
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
    let body
    if (req?.body?.feedback) {
      schema = Joi.object({
        feedback: Joi.array()
          .items(
            Joi.object({
              question_text: Joi.string(),
              question_type: Joi.string().default('TEXT'),
              validator_regex: Joi.string().default(''),
              pincode_regex: Joi.string().default(''),
              field: Joi.string().default(''),
            })
          )
          .min(1)
          .required(),
        id: Joi.number().required(),
      })
      body = { ...req.body, feedback: JSON.parse(req.body.feedback) }
    } else {
      const entry_fee = JSON.parse(req.body.entry_fee)
      if (Array.isArray(entry_fee)) {
        entry_fee.forEach((e) => {
          if (e.fee === '') {
            delete e.fee
          }
        })
      }
      body = { ...req.body, entry_fee }
    }
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

  static pairingValidator(req, res, next) {
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

  static prizeConfigValidator(req, res, next) {
    // TODO: update with the appropriate validation logic
    return next()
  }

  static uploadValidator(req, res, next) {
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
      // eslint-disable-next-line no-param-reassign
      req = value
      return next()
    }
  }

  static createPrizeValidator(req, res, next) {
    // create schema object
    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('age', 'rating').required(),
        gender: Joi.string().valid('M', 'F', 'B').required(),
        operator: Joi.number().valid(-1, 0, 1).required(),
        value: Joi.required(),
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

  static saveTournamentPrizeValidator(req, res, next) {
    // create schema object
    const schema = Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        tournament_id: Joi.number().required(),
        category_id: Joi.number(),
        prizes: Joi.array()
          .items(
            Joi.object({
              title: Joi.string().required(),
              amount: Joi.number(),
              trophy: Joi.boolean(),
              medal: Joi.boolean(),
            })
          )
          .min(1)
          .required(),
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

  static removePairings(req, res, next) {
    const schema = Joi.object({
      round: Joi.number().required(),
      tournamentId: Joi.number().required(),
      player_id: Joi.number(),
      opponent_id: Joi.number(),
    }).or('player_id', 'opponent_id')

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

  static addPairings(req, res, next) {
    const schema = Joi.object({
      round: Joi.number().required(),
      tournamentId: Joi.number().required(),
      player_id: Joi.number().required(),
      opponent_id: Joi.number().required(),
      type: Joi.string(),
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

module.exports = TournamentValidator
