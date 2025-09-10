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
      pairing_type: Joi.string().default('Individual'),
      prize: Joi.string(),
      is_club_membership: Joi.number().default(0),
      association_level: Joi.alternatives().conditional('is_club_membership', {
        is: 1,
        then: Joi.string().default('ChessClub'),
        otherwise: Joi.optional(),
      }),
      association_name: Joi.alternatives().conditional('is_club_membership', {
        is: 1,
        then: Joi.string().required(),
        otherwise: Joi.optional(),
      }),
      association_membership_duration: Joi.alternatives().conditional(
        'is_club_membership',
        { is: 1, then: Joi.string().required(), otherwise: Joi.optional() }
      ),
      association_membership_id_prefix: Joi.alternatives().conditional(
        'is_club_membership',
        { is: 1, then: Joi.string().required(), otherwise: Joi.optional() }
      ),
      mandatory_club_membership_name: Joi.string().allow(''),
      whatsapp_group_link: Joi.string(),
      max_participants: Joi.number().min(0).default(0),
      expected_participants: Joi.number().min(0).default(-1),
      multiple_registration: Joi.number().default(0),
      custom_message: Joi.string().allow(''),
      default_category: Joi.string().default(''),
      description: Joi.string().default(''),
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
      limit: Joi.number().default(1000).min(1).max(1000),
      offset: Joi.number().default(0).min(0),
      ongoing: Joi.boolean().default(false),
      search: Joi.string().allow('').default(''),
      userId: Joi.number(),
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
      player_id: Joi.number(),
      opponent_id: Joi.number(),
      type: Joi.string(),
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

  static updateTournamentValidator(req, res, next) {
    const categoryFeeSchema = Joi.object({
      category: Joi.string().required(),
      fee: Joi.alternatives(Joi.number(), Joi.string()).required(),
    })

    const categoryFeeMapSchema = Joi.object().pattern(
      Joi.string(), // category name
      Joi.any() // fee
    )
    const updateTournamentSchema = Joi.object({
      name: Joi.string(),
      organizer: Joi.string(),
      federation: Joi.string(),
      director: Joi.string(),
      arbiter: Joi.string(),
      time_control: Joi.string(),
      tournament_type: Joi.string(),
      start_date: Joi.date(),
      end_date: Joi.date().greater(Joi.ref('start_date')),
      reporting_time: Joi.string(), // TIME is stored as string
      meeting_time: Joi.string(), // TIME is stored as string
      rating: Joi.number(),
      rounds: Joi.number(),
      entry_fee: Joi.alternatives().try(
        Joi.array().items(categoryFeeSchema), // array of {category, fee}
        Joi.number(), // just a number
        categoryFeeMapSchema // { "Open": 200 }
      ),
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      brochure: Joi.string(),
      display_pic: Joi.string(),
      category: Joi.string(),
      player_fide_ids: Joi.string().max(20000),
      withdrawn_uuid: Joi.string().max(20000),
      current_round: Joi.number(),
      registration_inflow: Joi.number().default(100000),
      brochure_details: Joi.object(), // JSONB
      cct_id: Joi.number(),
      created_by: Joi.number(),
      is_active: Joi.boolean(),
      order_id: Joi.string(),
      previous_order_ids: Joi.object(), // JSONB
      enable_registration: Joi.boolean(),
      stakeholders_mobile_number: Joi.string(),
      feedback_key: Joi.string().uuid(),
      feedbacks: Joi.array(),
      pairing_type: Joi.string(),
      time_format: Joi.string(),
      is_club_membership: Joi.number().valid(0, 1),
      association_level: Joi.alternatives().conditional('is_club_membership', {
        is: 1,
        then: Joi.string(),
        otherwise: Joi.optional(),
      }),
      association_name: Joi.alternatives().conditional('is_club_membership', {
        is: 1,
        then: Joi.string(),
        otherwise: Joi.optional(),
      }),
      association_membership_id_prefix: Joi.alternatives().conditional(
        'is_club_membership',
        {
          is: 1,
          then: Joi.string(),
          otherwise: Joi.optional(),
        }
      ),
      association_membership_duration: Joi.alternatives().conditional(
        'is_club_membership',
        {
          is: 1,
          then: Joi.string(),
          otherwise: Joi.optional(),
        }
      ),
      mandatory_club_membership_name: Joi.string().allow(''),
      prize: Joi.string().allow(''),
      is_private: Joi.boolean(),
      csoc_batch: Joi.string().allow(''),
      password: Joi.string().allow(''),
      new_player_added: Joi.boolean(),
      parent_id: Joi.number(),
      whatsapp_group_link: Joi.string().allow(''),
      max_participants: Joi.number(),
      multiple_registration: Joi.number(),
      custom_message: Joi.string().allow(''),
      default_category: Joi.string().allow(''),
      description: Joi.string().allow(''),
    })
    // validate request body against schema
    if (req.body.entry_fee) {
      req.body.entry_fee = JSON.parse(req.body.entry_fee)
    }
    if (req.body.feedbacks) {
      req.body.feedbacks = JSON.parse(req.body.feedbacks)
    }
    const { error, value } = updateTournamentSchema.validate(req.body, options)

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
      req.body = Object.fromEntries(
        Object.entries(value).filter(([_, v]) => {
          return v !== null && v !== 'null'
        })
      )
      return next()
    }
  }

  // static tournamentConfigValidator(req, res, next) {
  //   const schema = Joi.object({})
  // }

  static roundStartValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      round: Joi.number().greater(0).required(),
      tournamentId: Joi.number().required(),
      time_control: Joi.string().required(),
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

  static roundCleanupValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      round: Joi.number().greater(0).required(),
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

  static formTournamentValidator(req, res, next) {
    const schema = Joi.object({
      custom_message: Joi.string().allow(''),
      default_category: Joi.string().default(''),
      entry_fee: Joi.number().required(),
      expected_participants: Joi.number().min(0).default(-1),
      increment_time: Joi.number().required(),
      initial_time: Joi.number().required(),
      is_private: Joi.boolean(),
      max_participants: Joi.number().min(0).default(0),
      name: Joi.string().required(),
      organizer: Joi.string().required(),
      password: Joi.string(),
      rated: Joi.boolean(),
      rounds: Joi.number().required(),
      startDate: Joi.date(),
      tournament_type: Joi.string().required(),
      multiple_registration: Joi.number().default(0),
      mandatory_club_membership_name: Joi.string().allow(''),
    })

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
      req.body = value
      return next()
    }
  }
}

module.exports = TournamentValidator
