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

  getPlayersByTournament = async (req, res) => {
    try {
      const { id } = req.params
      const players = await this.playerService.getPlayersByTournament(id)
      const { status, message, data } = players.response
      res.status(players.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  updatePlayerDetails = async (req, res) => {
    try {
      const { id } = req.params
      const user = await this.playerService.updatePlayerDetails(id, req.body)
      const { status, message, data } = user.response
      res.status(user.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  updateWinningPlayerDetails = async (req, res) => {
    try {
      const { id } = req.params
      const user = await this.playerService.updateWinningPlayerDetails(
        id,
        req.body
      )
      const { status, message, data } = user.response
      res.status(user.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  uploadPrizeWinningPlayers = async (req, res) => {
    try {
      const players = await this.playerService.uploadPrizeWinningPlayers(req)
      const { status, message, data } = players.response
      res.status(players.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getPrizeWinningPlayers = async (req, res) => {
    try {
      const { tournamentId } = req.params
      const players = await this.playerService.getPrizeWinningPlayers(
        tournamentId
      )
      const { status, message, data } = players.response
      res.status(players.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  addPlayer = async (req, res) => {
    try {
      const { id } = req.params
      const player = await this.playerService.addPlayer(id, req.body)
      const { status, message, data } = player.response
      res.status(player.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  withDrawPlayer = async (req, res) => {
    try {
      const player = await this.playerService.withDrawPlayer(req.body)
      const { status, message, data } = player.response
      res.status(player.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = TournamentController
