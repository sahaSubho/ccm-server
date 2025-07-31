const Joi = require('joi')
const httpStatus = require('http-status')
const ApiError = require('../helper/ApiError')
const { userRoles } = require('../config/constant')

class UserValidator {
  static async userCreateValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      confirm_password: Joi.string().valid(Joi.ref('password')).required(),
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      phone_number: Joi.string().required(),
      country_code: Joi.string().required(),
      role: Joi.string()
        .valid(userRoles.ORGANIZER, userRoles.PLAYER)
        .required(),
    })

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    }

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

  static async userLoginValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    })

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    }

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

  static async checkEmailValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      email: Joi.string().email().required(),
    })

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    }

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

  static async changePasswordValidator(req, res, next) {
    // create schema object
    const schema = Joi.object({
      country_code: Joi.string().required(),
      mobile_number: Joi.string().required(),
      password: Joi.string().min(6).required(),
      confirm_password: Joi.string().min(6).required(),
    })

    // schema options
    const options = {
      abortEarly: false, // include all errors
      allowUnknown: true, // ignore unknown props
      stripUnknown: true, // remove unknown props
    }

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

module.exports = UserValidator
