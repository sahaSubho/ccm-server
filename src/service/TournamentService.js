const httpStatus = require('http-status')
const { Op } = require('sequelize')
const moment = require('moment')
const TournamentDao = require('../dao/TournamentDao')
const PlayersDao = require('../dao/PlayersDao')
const TournamentPairingsDao = require('../dao/TournamentPairingDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const { userRoles } = require('../config/constant')
const {
  swissFirstRoundPairing,
  swissOtherRoundPairings,
} = require('../helper/swiss')

class TournamentService {
  constructor() {
    this.tournamentDao = new TournamentDao()
    this.playersDao = new PlayersDao()
    this.tournamentPairingsDao = new TournamentPairingsDao()
  }

  /**
   * Create a user
   * @param {Object} tournamentBody
   * @returns {Object}
   */
  createTournament = async (tournamentBody, req) => {
    try {
      let message = 'Successfully created tournament.'
      if (req.user.role !== userRoles.ORGANIZER) {
        message =
          'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
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

  /**
   * Get Tournament List created by Organizer
   * @returns {Object}
   */
  getTournamentsByUser = async (userId) => {
    try {
      let message = 'Fetched tournaments successfully.'
      let data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          created_by: userId,
          start_date: { [Op.gte]: moment() },
        },
        undefined,
        ['end_date', 'asc']
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

  getNumberWithOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  /**
   * Create Tournament Pairing
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  createTournamentPairing = async (round, tournamentId) => {
    try {
      let message = `Paired successfully for the ${this.getNumberWithOrdinal(
        round
      )} round of the tournament.`

      const tournament = await this.tournamentDao.findById(tournamentId)

      if (!tournament.player_fide_ids) {
        message =
          'The pairing process cannot be initiated as there are no players available for matching. Please upload player information first.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let data = []
      if (round === 1) {
        const players = await this.playersDao.findByWhere({
          fide_id: tournament.player_fide_ids.split(','),
          is_active: true,
        })
        const { whitePlayers, blackPlayers } = swissFirstRoundPairing(
          players,
          tournamentId
        )
        data = whitePlayers.map((w, i) => [w, blackPlayers[i]])
        const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
        if (!res) {
          message = 'Failed to pair players! Please try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        const opponents = blackPlayers.map((b, i) => ({
          ...b,
          parent_id: res[i].id,
        }))
        await this.tournamentPairingsDao.bulkCreate(opponents)
      } else {
        const pairing = await this.tournamentPairingsDao.findByWhere({
          round: round,
        })
        const players = pairing.filter((p) => !p.parent_id)
        const opponents = pairing.filter((p) => p.parent_id)
        const { whitePlayers, blackPlayers } = swissOtherRoundPairings(
          players,
          opponents,
          round,
          tournamentId
        )
        data = whitePlayers.map((w, i) => [w, blackPlayers[i]])
        const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
        if (!result) {
          message = 'Failed to upload players! Please try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        const newOpponents = blackPlayers.map((b, i) => ({
          ...b,
          parent_id: res[i].id,
        }))
        await this.tournamentPairingsDao.bulkCreate(newOpponents)
      }

      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Get Tournament Pairing for particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPairings = async (round, tournamentId) => {
    try {
      let message = 'Fetched tournament player pairings successfully.'
      let data = await this.tournamentPairingsDao.findByWhere({
        round: round,
        tournament_id: tournamentId,
      })
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
