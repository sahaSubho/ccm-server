const httpStatus = require('http-status')
const { Op } = require('sequelize')
const moment = require('moment')
const TournamentDao = require('../dao/TournamentDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')

class TournamentService {
  constructor() {
    this.tournamentDao = new TournamentDao()
  }

  /**
   * Create a user
   * @param {Object} tournamentBody
   * @returns {Object}
   */
  createTournament = async (tournamentBody, req) => {
    try {
      let message = 'Successfully created tournament.'
      if (req?.files?.length) {
        req.files.forEach((f) => {
          if (f.path.includes('brochure')) {
            tournamentBody.brochure = f.path
          }
          if (f.path.includes('image')) {
            tournamentBody.display_pic = f.path
          }
        })
      }

      tournamentBody.created_by = req.user.id
      tournamentBody.is_active = true

      let data = await this.tournamentDao.create(tournamentBody)

      if (!data) {
        message = 'Tournament creation failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.CREATED, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Get Tournament List
   * @returns {Object}
   */
  getTournaments = async (limit = 10, offset = 0) => {
    try {
      let message = 'Fetched tournaments successfully.'
      let data = await this.tournamentDao.findByWhere(
        { is_active: true, end_date: { [Op.gte]: moment() } },
        undefined,
        ['end_date', 'asc'],
        limit,
        offset
      )
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }
}

module.exports = TournamentService
