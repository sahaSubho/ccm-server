const httpStatus = require('http-status')
const PlayerService = require('../service/PlayerService')
const logger = require('../config/logger')

class TournamentController {
  constructor() {
    this.playerService = new PlayerService()
  }

  uploadPlayers = async (req, res) => {
    try {
      const user = await this.playerService.uploadPlayers(req)
      const { status, message, data } = user.response
      res.status(user.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = TournamentController
