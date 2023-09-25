const httpStatus = require('http-status')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const PlayersDao = require('../dao/PlayersDao')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const TournamentDao = require('../dao/TournamentDao')
const TournamentPairingDao = require('../dao/TournamentPairingDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const parseFile = require('../helper/parseFile')
const { userRoles } = require('../config/constant')
const { sequelize } = require('../models')

class PlayersService {
  constructor() {
    this.playersDao = new PlayersDao()
    this.tournamentDao = new TournamentDao()
    this.tournamentPairingDao = new TournamentPairingDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
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

      if (!data) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (
        data.length &&
        !Object.keys(data[0]).includes('name', 'gender', 'age')
      ) {
        message =
          'Name, Gender and Age is mandatory fields! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      data = data.map((d) => ({
        ...d,
        uuid: uuidv4(),
        created_by: userRoles.ORGANIZER,
        mobile: d?.mobile_number || '',
        upi_id: d?.upi_address || '',
      }))

      const tournamentId = req.body.tournamentId
      const tournament = await this.tournamentDao.findById(tournamentId)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',')
      }

      let players = await this.playersDao.findByWhere({
        [Op.or]: [
          {
            mobile: data.map((d) => d.mobile_number),
          },
          {
            name: data.map((d) => d.name),
          },
        ],
      })

      if (players.length > 0) {
        data = data.filter(
          (ele) =>
            !players.some(
              (p) => p.mobile === ele.mobile_number && p.name === ele.name
            )
        )
      }

      const playerUuids = players.map((p) => p.uuid)

      if (
        playerUuids.length &&
        playerUuids.every((id) => fide_ids.includes(id))
      ) {
        message = 'Players are already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const result = await this.playersDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const ids = [
        ...new Set(fide_ids),
        ...new Set(playerUuids),
        ...new Set(data.map((r) => r.uuid)),
      ]

      await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: tournamentId }
      )

      const finalData = await this.playersDao.findByWhere({ uuid: ids })

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        message,
        finalData
      )
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Add player
   * @param {Number} id
   * @param {Object} body
   * @returns {Object}
   */
  addPlayer = async (id, body) => {
    try {
      let message = 'Successfully added player.'

      const data = {
        ...body,
        uuid: uuidv4(),
        created_by: userRoles.ORGANIZER,
      }
      const tournament = await this.tournamentDao.findById(id)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',')
      }

      let player = await this.playersDao.findOneByWhere({
        [Op.or]: [
          {
            mobile: data.mobile || '',
          },
          {
            name: data.name,
          },
        ],
      })

      if (player && fide_ids.includes(player.uuid)) {
        message = 'Player is already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const result = await this.playersDao.create(data)

      if (!result) {
        message = 'Failed to add player! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const ids = [...new Set([...fide_ids, data.uuid])]

      await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: id }
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
      const data = await this.playersDao.findByWhere({ uuid: fide_ids })

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

  /**
   * Upload Prize Winning Players
   * @param {Object} req
   * @returns {Array}
   */
  uploadPrizeWinningPlayers = async (req) => {
    try {
      let message = 'Successfully uploaded winning players.'
      const filePath = req.file.path
      const type = req.file.mimetype

      let data = await parseFile(filePath, type)

      if (!data) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const tournamentId = req.body.tournamentId
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })

      data = data
        .filter(
          (d) =>
            !players.some(
              (p) => p.mobile_number === d.mobile_number || p.name === d.name
            )
        )
        .map((e) => ({ ...e, tournament_id: tournamentId }))

      if (!data.length) {
        message = 'Players already exists.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const result = await this.playersPrizePayoutDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.CREATED, message, result)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Get Prize Winning Players
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPrizeWinningPlayers = async (tournamentId) => {
    try {
      let message = 'Successfully fetched players for tournament.'
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })

      if (!players) {
        message = 'No players exist for this tournament!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.OK, message, players)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * update prize winning players
   * @param {Number} playerId
   * @param {body} playerBody
   * @returns {Object}
   */
  updateWinningPlayerDetails = async (playerId, playerBody) => {
    try {
      let message = 'Successfully updated players.'

      const data = await this.playersPrizePayoutDao.updateById(
        playerBody,
        playerId
      )

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

  createJuspayPayout = async (tournamentId, user) => {
    try {
      let message
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })
      if (!players.some((p) => p.upi_id.length || p.amount > 0)) {
        message =
          'Amount should be greater than 0 and UPI Id should be available for all players!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const random5char = Math.random().toString(36).substr(2, 5)
      const data = {
        orderId: `PAYOUT${moment().format('YYYYMM')}${random5char}`,
        fulfillments: players.map((p) => ({
          amount: p.amount,
          beneficiaryDetails: {
            details: {
              name: p.name,
              vpa: p.upi_id,
            },
            type: 'UPI_ID',
          },
        })),
        amount: players.reduce((t, s) => t + s.amount, 0),
        customerId: user.id,
        customerPhone: user.phone_number,
        customerEmail: user.email,
        type: 'FULFILL_ONLY',
        udf1: '',
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
      }
      let options = {
        url: config.juspay.url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(config.juspay.apiKey)}`,
          'x-merchantid': config.juspay.merchantId,
        },
        body: JSON.stringify(data),
      }

      message =
        'Payout to all players have been inititated succesfully. You can check the status in the table.!'

      const juspayResponse = await fetch(options)

      return responseHandler.returnSuccess(
        httpStatus.OK,
        message,
        juspayResponse
      )
    } catch (error) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * withdraw player by tournament
   * @param {Object} playerBody
   * @returns {Object}
   */
  withDrawPlayer = async (playerBody) => {
    try {
      let message = 'Successfully withdrawn player from this round.'

      const data = await this.tournamentPairingDao.updateWhere(
        { is_withdrawn: true },
        {
          tournament_id: playerBody.tournamentId,
          round: playerBody.round,
          player_uuid: playerBody.uuid,
        }
      )

      if (!data.length) {
        message = 'Failed to withdraw player from this round.'
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

  /**
   * get player details
   * @param {String} uuid
   * @param {Number} tournamentId
   * @returns {Object}
   */
  getPlayersDetails = async (uuid, tournamentId) => {
    try {
      let message = 'Successfully fetch player details.'

      const player = await this.playersDao.findOneByWhere({ uuid: uuid })

      if (!player) {
        message = 'Failed to fetch player details.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const tournaments = await this.tournamentPairingDao.findByWhere({
        player_uuid: uuid,
      })

      let query = `select * from tournament_pairings where (parent_id in (select id from tournament_pairings where player_uuid='${uuid}') or 
        id in (select parent_id from tournament_pairings where player_uuid='${uuid}'))`

      if (tournamentId) query += ` and tournament_id=${tournamentId}`

      query += 'order by tournament_id, round'

      const data = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
      })

      const result = {
        details: {
          ...player.toJSON(),
          tournaments,
        },
        opponents: data,
      }
      return responseHandler.returnSuccess(httpStatus.OK, message, result)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }
}

module.exports = PlayersService
