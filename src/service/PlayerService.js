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
   * Create a user
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
        fide_ids = tournament.player_fide_ids.split(',')
        data = data.filter(
          (ele) => !tournament.player_fide_ids.includes(ele.fide_id)
        )
      }

      if (!data.length) {
        message = 'Players are already registered in this tournament.'
        return responseHandler.returnError(httpStatus.OK, message)
      }

      const result = await this.playersDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const ids = [...fide_ids, ...new Set(result.map((r) => r.fide_id))]
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
}

module.exports = PlayersService
