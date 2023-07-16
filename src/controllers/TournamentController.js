const httpStatus = require('http-status')
const TournamentService = require('../service/TournamentService')
const logger = require('../config/logger')

class TournamentController {
  constructor() {
    this.tournamentService = new TournamentService()
  }

  create = async (req, res) => {
    try {
      const user = await this.tournamentService.createTournament(req.body, req)
      const { status, message, data } = user.response
      res.status(user.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getTournaments = async (req, res) => {
    try {
      const { limit, offset } = req.query
      const tournaments = await this.tournamentService.getTournaments(
        limit,
        offset
      )
      const { status, message, data } = tournaments.response
      res.status(tournaments.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = TournamentController
