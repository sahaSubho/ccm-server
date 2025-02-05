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
      const tournament = await this.tournamentService.createLichessTournament(
        req.body,
        req
      )
      const { status, message, data } = tournament.response
      res.status(tournament.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getTournaments = async (req, res) => {
    try {
      const { limit, offset, country} = req.query
      const tournaments = await this.tournamentService.getTournaments(
        limit,
        offset,
        country
      )
      const { status, message, data } = tournaments.response
      res.status(tournaments.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getCirclechessTournaments = async (req, res) => {
    try {
        const { limit = 10, offset = 0, ...filters } = req.query;

        // Convert comma-separated query params into arrays (for multi-select filters)
        const formattedFilters = Object.keys(filters).reduce((acc, key) => {
            acc[key] = filters[key].split(','); // Convert "Blitz,Rapid" -> ["Blitz", "Rapid"]
            return acc;
        }, {});

        const tournaments = await this.tournamentService.getCirclechesssTournaments(
            limit,
            offset,
            formattedFilters
        );

        const { status, message, data } = tournaments.response;
        res.status(tournaments.statusCode).send({ status, message, data });
    } catch (e) {
        logger.error(e);
        res.status(httpStatus.BAD_GATEWAY).send(e);
    }
  };


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
  getJoinedTournamentByUserId = async (req, res) => {
    try {
      const { userId } = req.query;
      console.log(userId, req.query);
      const tournaments = await this.tournamentService.getJoinedTournaments(userId)
      const { status, message, data } = tournaments.response
      res.status(tournaments.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  updateCirclechessTournament = async (req,res) => {
    try {
      const { id } = req.params
      const update = await this.tournamentService.updateTournamentEndstatus(id, req.body)
      const { status, message } = update.response 
      res.status(update.statusCode).send({ status, message,})
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }   

  getTournamentsByUser = async (req, res) => {
    try {
      const tournaments = await this.tournamentService.getTournamentsByUser(
        req.user,
        req.query
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

  revertTournamentPairing = async (req, res) => {
    try {
      const { tournamentId } = req.query
      const pairings = await this.tournamentService.revertTournamentPairing(
        tournamentId
      )
      const { status, message, data } = pairings.response
      res.status(pairings.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  uploadTournamentPairing = async (req, res) => {
    try {
      const { round, tournamentId } = req.body
      const pairing = await this.tournamentService.uploadTournamentPairing(
        req,
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
      const { round, tournamentId, gameId = '' } = req.query
      const pairing = await this.tournamentService.updateScoring(
        round,
        tournamentId,
        gameId,
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
      const { id } = req.params
      const prizeCategories =
        await this.tournamentService.updatePrizingCategories(id, req.body)
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
    const prizeCats = await this.tournamentService.getStaticPrizeCategories(id)
    const { status, message, data } = prizeCats.response
    res.status(prizeCats.statusCode).send({ status, message, data })
  }

  uploadWinners = async (req, res) => {
    try {
      const winners = await this.tournamentService.uploadWinners(req)
      const { status, message, data } = winners.response
      res.status(winners.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  createPrizingCategories = async (req, res) => {
    try {
      const prizes = await this.tournamentService.createPrizingCategories(
        req.body
      )
      const { status, message, data } = prizes.response
      res.status(prizes.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getStatistics = async (req, res) => {
    try {
      const statistics = await this.tournamentService.getStatistics(req.user.id)
      const { status, message, data } = statistics.response
      res.status(statistics.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  updateTournamentById = async (req, res) => {
    try {
      const { id } = req.params
      const user = await this.tournamentService.updateTournamentById(
        id,
        req.body,
        req
      )
      const { status, message, data } = user.response
      res.status(user.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  removePairings = async (req, res) => {
    try {
      const { round, tournamentId, player_id, opponent_id } = req.body
      const pairing = await this.tournamentService.removePairings(
        round,
        tournamentId,
        player_id,
        opponent_id
      )
      const { status, message } = pairing.response
      res.status(pairing.statusCode).send({ status, message })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  addPairings = async (req, res) => {
    try {
      const { round, tournamentId, player_id, opponent_id, type } = req.body
      const pairing = await this.tournamentService.addPairings(
        round,
        tournamentId,
        player_id,
        opponent_id,
        type
      )
      const { status, message } = pairing.response
      res.status(pairing.statusCode).send({ status, message })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  setConfiguration = async (req, res) => {
    try {
      const { id } = req.params
      const resp = await this.tournamentService.setConfiguration(id, req.body)
      const { status, message, data } = resp.response
      res.status(resp.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getConfiguration = async (req, res) => {
    try {
      const { id } = req.params
      const resp = await this.tournamentService.getConfiguration(id)
      const { status, message, data } = resp.response
      res.status(resp.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = TournamentController
