const httpStatus = require('http-status')
const PlayersDao = require('../dao/PlayersDao')
const TournamentDao = require('../dao/TournamentDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const parseFile = require('../helper/parseFile')
const { userRoles } = require('../config/constant')

class PlayersService {
  constructor() {
    this.playersDao = new PlayersDao()
    this.tournamentDao = new TournamentDao()
  }

  /**
   * Upload players
   * @param {Object} req
   * @returns {Object}
   */
  uploadPlayers = async (req) => {
    try {
      let message = 'Successfully uploaded players.'
      const filePath = req.file.path
      const type = req.file.mimetype

      let data = await parseFile(filePath, type)

      data = data.map((d) => ({ ...d, created_by: userRoles.ORGANIZER }))

      if (!data) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const tournamentId = req.body.tournamentId
      const tournament = await this.tournamentDao.findById(tournamentId)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',').map((f) => Number(f))
        data = data.filter((ele) => !fide_ids.includes(Number(ele.fide_id)))
      }

      if (!data.length) {
        message = 'Players are already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let players = await this.playersDao.findByWhere(
        {
          fide_id: data.map((d) => d.fide_id),
        },
        ['fide_id']
      )

      players = players.map((p) => p?.fide_id)

      if (players.length > 0) {
        data = data.filter((ele) => !players.includes(Number(ele.fide_id)))
      }

      const result = await this.playersDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const ids = [
        ...new Set(fide_ids),
        ...new Set(players),
        ...new Set(data.map((r) => Number(r.fide_id))),
      ]

      await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: tournamentId }
      )

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
   * get list of player for each tournament
   * @param {Number} tournamentId
   * @returns {Object}
   */
  getPlayersByTournament = async (tournamentId) => {
    try {
      let message = 'Successfully fetched players for tournament.'
      const tournament = await this.tournamentDao.findById(tournamentId)

      if (!tournament.player_fide_ids) {
        message = 'No players exist for this tournament!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const fide_ids = tournament.player_fide_ids.split(',')
      const data = await this.playersDao.findByWhere({ fide_id: fide_ids })

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
   * get list of player for each tournament
   * @param {Number} playerId
   * @param {body} playerBody
   * @returns {Object}
   */
  updatePlayerDetails = async (playerId, playerBody) => {
    try {
      let message = 'Successfully updated players.'

      const data = await this.playersDao.updateById(playerBody, playerId)

      if (!data.length) {
        message = 'Players details failed to update.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      return responseHandler.returnSuccess(
        httpStatus.NO_CONTENT,
        message,
        playerBody
      )
    } catch (error) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }
}

module.exports = PlayersService
