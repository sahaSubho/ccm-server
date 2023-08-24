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

  createLichessTournament = async (req, res) => {
    try {
      const tournament = await this.tournamentService.createLichessTournament(req.body, req)
      const { status, message, data } = tournament.response
      res.status(tournament.statusCode).send({ status, message, data })
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

  getTournamentById = async (req, res) => {
    try {
      const { id } = req.params
      const tournaments = await this.tournamentService.getTournamentById(id)
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

  getPlayersRanking = async (req, res) => {
    try {
      const { round, tournamentId } = req.query
      const pairing = await this.tournamentService.getPlayersRanking(
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

  updateScoring = async (req, res) => {
    try {
      const { round } = req.query
      const pairing = await this.tournamentService.updateScoring(
        round,
        req.body
      )
      const { status, message, data } = pairing.response
      res.status(pairing.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  updatePrizeCategories = async (req, res) => {
    try {
      const prizeCategories = await this.tournamentService.updatePrizingCategories(req.body, req)
      const { status, message, data } = prizeCategories.response
      res.status(prizeCategories.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getStaticPrizeCategories = async (req, res) => {
    // Return static values only, no fancy processing
    const { id } = req.params
    console.log('ID = ', id)
    const prizeCats = await this.tournamentService.getStaticPrizeCategories(id)
    const { status, message, data } = prizeCats.response
    res.status(prizeCats.statusCode).send({ status, message, data })
  }
}

module.exports = TournamentController
