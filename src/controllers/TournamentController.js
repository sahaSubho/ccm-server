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

  getTournamentsByUser = async (req, res) => {
    try {
      const tournaments = await this.tournamentService.getTournamentsByUser(
        req.user.id
      )
      const { status, message, data } = tournaments.response
      res.status(tournaments.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  createTournamentPairing = async (req, res) => {
    try {
      const { round, tournamentId } = req.query
      const pairings = await this.tournamentService.createTournamentPairing(
        round,
        tournamentId
      )
      const { status, message, data } = pairings.response
      res.status(pairings.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getPairings = async (req, res) => {
    try {
      const { round, tournamentId } = req.query
      const pairing = await this.tournamentService.getPairings(
        round,
        tournamentId
      )
      const { status, message, data } = pairing.response
      res.status(pairing.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = TournamentController
