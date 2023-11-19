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
const moment = require('moment')
const { sortByInitialRankings } = require('../helper/swiss')

class PlayersService {
  constructor() {
    this.playersDao = new PlayersDao()
    this.tournamentDao = new TournamentDao()
    this.tournamentPairingDao = new TournamentPairingDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
  }

  parseGender = (gender) => {
    if (['male', 'm', 'b', 'boys', 'boy'].includes(gender.toLowerCase())) {
      return 'M'
    }
    if (
      ['female', 'f', 'w', 'girls', 'girl', 'women'].includes(
        gender.toLowerCase()
      )
    ) {
      return 'F'
    }
    return ''
  }
  /**
   * Upload players
   * @param {Object} req
   * @returns {Object}
   */
  uploadPlayers = async (req) => {
    try {
      let message
      const filePath = req.file.path
      const type = req.file.mimetype

      let data = await parseFile(filePath, type)

      if (!data.length) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (
        data.length &&
        !['name', 'gender', 'birth_year'].every((x) =>
          Object.keys(data[0]).includes(x)
        )
      ) {
        message =
          'Name, Gender and Birth Year is mandatory fields! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const tournamentId = req.body.tournamentId
      const tournament = await this.tournamentDao.findById(tournamentId)

      const where = [{ name: data.map((d) => d.name) }]
      if (Object.keys(data[0]).includes('mobile_number')) {
        where.push({ mobile: data.map((d) => String(d.mobile_number)) })
      }
      if (Object.keys(data[0]).includes('fide_id')) {
        where.push({ fide_id: data.map((d) => Number(d.fide_id)) })
      }

      data = data.map((d) => ({
        name: d.name,
        fide_id: Number(d?.fide_id) || null,
        rating: Number(d.rating) || 0,
        gender: this.parseGender(d.gender),
        uuid: uuidv4(),
        created_by: userRoles.ORGANIZER,
        age: moment(tournament.start_date).year() - Number(d.birth_year),
        mobile: d?.mobile_number || '',
        upi_id: d?.upi_address || '',
        title: d?.title || '',
      }))

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',')
      }

      let players = await this.playersDao.findByWhere({
        [Op.or]: where,
      })

      let common = []
      let newPlayers = []
      let invalidPlayer = []
      if (players.length > 0) {
        data.forEach((p, i) => {
          let MostMatchedPlayer = null
          let j = 0
          while (j < players.length) {
            const r = players[j]
            if (!!p['mobile']?.length && r['mobile'] === p['mobile']) {
              if (p.name === r.name) {
                MostMatchedPlayer = r
              } else if (!!p['fide_id'] && r.fide_id === p.fide_id) {
                invalidPlayer.push(p.name)
              }
              break
            }
            if (!!p['fide_id'] && r['fide_id'] === p['fide_id']) {
              if (p.name === r.name) {
                MostMatchedPlayer = r
              } else {
                invalidPlayer.push(p.name)
              }
              break
            }
            if (p.name === r.name && p.age === r.age) {
              MostMatchedPlayer = r
              break
            }
            j += 1
          }
          if (MostMatchedPlayer) {
            common.push(MostMatchedPlayer)
          } else if (!invalidPlayer.includes(p.name)) {
            newPlayers.push(p)
          }
        })
      } else {
        newPlayers = data
      }

      data = newPlayers
      const playerUuids = common.map((p) => p.uuid)

      if (
        !data.length &&
        playerUuids.length &&
        playerUuids.every((id) => fide_ids.includes(id))
      ) {
        message = 'Players are already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (data.length) {
        const result = await this.playersDao.bulkCreate(data)

        if (!result) {
          message = 'Failed to upload players! Please try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
      }

      const ids = [
        ...new Set(fide_ids),
        ...new Set(playerUuids),
        ...new Set(data.map((r) => r.uuid)),
      ].filter((id) => id || id.length)

      await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: tournamentId }
      )

      message = `Successfully uploaded ${ids.length} players`
      if (invalidPlayer.length) {
        message += ` except players with names ${invalidPlayer.join()} due to incorrect Fide Id.`
      }

      const finalData = await this.playersDao.findByWhere({ uuid: ids })

      return responseHandler.returnSuccess(
        httpStatus.CREATED,
        message,
        sortByInitialRankings(finalData)
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
        title: body.title || '',
        uuid: uuidv4(),
        created_by: userRoles.ORGANIZER,
      }
      const tournament = await this.tournamentDao.findById(id)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',')
      }

      const where = [{ name: data.name }]
      if (Object.keys(data).includes('mobile')) {
        where.push({ mobile: String(data.mobile) })
      }
      if (Object.keys(data).includes('fide_id')) {
        where.push({ fide_id: Number(data.fide_id) })
      }

      let players = await this.playersDao.findByWhere({
        [Op.or]: where,
      })

      let player = null
      let invalidPlayer = false
      let i = 0
      while (i < players.length) {
        const r = players[i]
        if (r['mobile'] === data['mobile']) {
          if (data.name === r.name) {
            player = r
          } else if (!!p['fide_id'] && r.fide_id === p.fide_id) {
            invalidPlayer = true
          }
          break
        }
        if (!!data['fide_id'] && r['fide_id'] === Number(data['fide_id'])) {
          if (data.name === r.name) {
            player = r
          } else {
            invalidPlayer = true
          }
          break
        }
        if (data.name === r.name && data.age === r.age) {
          player = r
          break
        }
        i += 1
      }
      if (invalidPlayer) {
        message = 'Player already exists with same Fide Id.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (player && fide_ids.includes(player.uuid)) {
        message = 'Player is already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let ids = fide_ids
      if (!player) {
        await this.playersDao.create(data)
        ids.push(data.uuid)
      } else {
        ids.push(player.uuid)
      }

      ids = [...new Set(ids)]

      const result = await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: id }
      )
      if (!result) {
        message = 'Failed to add player! Please try again.'
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
      let withDrawnIds = []
      if (tournament.withdrawn_uuid) {
        withDrawnIds = tournament.withdrawn_uuid.split(',')
      }
      const data = await this.playersDao.findByWhere({
        uuid: fide_ids.concat(withDrawnIds),
      })

      const result = sortByInitialRankings(data)
        .map((p) => ({
          ...p,
          isWithDrawn: withDrawnIds.includes(p.uuid),
        }))
        .sort((a, b) => (b.isWithDrawn ? -1 : 1))

      return responseHandler.returnSuccess(httpStatus.OK, message, result)
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
      let message = 'Successfully withdrawn player from this tournament.'

      const tournament = await this.tournamentDao.findById(
        playerBody.tournamentId
      )

      if (tournament.player_fide_ids) {
        let fide_ids = tournament.player_fide_ids.split(',')
        let withDrawn_ids = []
        if (tournament.withdrawn_uuid)
          withDrawn_ids = tournament.withdrawn_uuid.split(',')

        if (playerBody.is_withdrawn) {
          fide_ids = fide_ids.filter((id) => id !== playerBody.uuid)
          withDrawn_ids.push(playerBody.uuid)
        } else {
          message = 'Successfully added player again for this tournament.'
          fide_ids.push(playerBody.uuid)
          withDrawn_ids = withDrawn_ids.filter((id) => id !== playerBody.uuid)
        }

        await this.tournamentDao.updateById(
          {
            player_fide_ids: fide_ids.join(),
            withdrawn_uuid: withDrawn_ids.join(),
          },
          playerBody.tournamentId
        )
      }

      const data = await this.tournamentPairingDao.updateWhere(
        { is_withdrawn: playerBody.is_withdrawn },
        {
          tournament_id: playerBody.tournamentId,
          round: playerBody.round,
          player_uuid: playerBody.uuid,
        }
      )

      if (!data.length) {
        message = 'Failed to withdraw player from this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      return responseHandler.returnSuccess(httpStatus.OK, message)
    } catch (e) {
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

      let query = `select * from tournament_pairings where (parent_id in (select id from tournament_pairings where player_uuid='${uuid}') or 
      id in (select parent_id from tournament_pairings where player_uuid='${uuid}'))`

      const where = {
        player_uuid: uuid,
      }
      let tournamentName = ''

      if (tournamentId) {
        query += ` and tournament_id=${tournamentId}`
        where['tournament_id'] = tournamentId
        const tournament = await this.tournamentDao.findById(tournamentId)
        tournamentName = tournament.name
      }

      const tournaments = await this.tournamentPairingDao.findByWhere(where)
      query += 'order by tournament_id, round'

      const data = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
      })

      const result = {
        tournamentName,
        details: {
          ...player.toJSON(),
          tournaments: tournaments.filter(
            (t) =>
              !(
                t.result ===
                  data.find((p) => p.parent_id === t.id || t.parent_id === p.id)
                    ?.result && Number(t.result) === 0
              )
          ),
        },
        opponents: data.filter(
          (t) =>
            !(
              t.result ===
                tournaments.find(
                  (p) => p.parent_id === t.id || t.parent_id === p.id
                )?.result && Number(t.result) === 0
            )
        ),
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
