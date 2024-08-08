const httpStatus = require('http-status')
const { Op } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const levenshtein = require('fast-levenshtein')
const PlayersDao = require('../dao/PlayersDao')
const TeamsDao = require('../dao/TeamsDao')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const TournamentDao = require('../dao/TournamentDao')
const TournamentPairingDao = require('../dao/TournamentPairingDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const parseFile = require('../helper/parseFile')
const { parseChessResultFile } = require('../helper/parseFile')
const { userRoles } = require('../config/constant')
const { sequelize } = require('../models')
const { sortByInitialRankings } = require('../helper/pairingEngine/swiss')
const JuspayService = require('./JuspayService')
const RedisService = require('./RedisService')
class PlayersService {
  constructor() {
    this.playersDao = new PlayersDao()
    this.teamsDao = new TeamsDao()
    this.tournamentDao = new TournamentDao()
    this.tournamentPairingDao = new TournamentPairingDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
    this.juspayService = new JuspayService()
    this.redisService = new RedisService()
  }

  static parseGender = (gender) => {
    if (['male', 'm', 'b', 'boys', 'boy'].includes(gender?.toLowerCase())) {
      return 'M'
    }
    if (
      ['female', 'f', 'w', 'girls', 'girl', 'women'].includes(
        gender?.toLowerCase()
      )
    ) {
      return 'F'
    }
    return ''
  }

  static areNamesSimilar = (name1, name2, threshold = 0.5) => {
    // Convert names to lowercase for case-insensitive comparison
    name1 = name1.toLowerCase()
    name2 = name2.toLowerCase()

    // Calculate the Levenshtein distance
    const distance = levenshtein.get(name1, name2)
    const maxLen = Math.max(name1.length, name2.length)
    const normalizedDistance = maxLen > 0 ? distance / maxLen : 0

    // Check if the normalized distance is less than or equal to the threshold
    return normalizedDistance <= threshold
  }

  processUniquePlayers = async (input, tournamentId, isChatbot = false) => {
    let message = ''
    let data = input
    const tournament = await this.tournamentDao.findById(tournamentId)

    const where = [
      {
        name: data.map((d) => {
          return d.name
        }),
      },
    ]
    if (Object.keys(data[0]).includes('mobile_number')) {
      where.push({
        mobile: data.map((d) => {
          return String(d.mobile_number)
        }),
      })
    }
    if (
      data.some((d) => {
        return !!d?.fide_id
      })
    ) {
      where.push({
        fide_id: data
          .filter((d) => {
            return !!d?.fide_id
          })
          .map((d) => {
            return Number(d.fide_id)
          }),
      })
    }

    data = data.map((d) => {
      return {
        name: d.name,
        fide_id: Number(d?.fide_id) || null,
        rating: Number(d.rating) || 0,
        gender: PlayersService.parseGender(d.gender),
        uuid: uuidv4(),
        created_by: isChatbot ? 'Chatbot' : userRoles.ORGANIZER,
        age: moment(tournament.start_date).year() - Number(d.birth_year),
        mobile: d?.mobile_number || '',
        upi_id: d?.upi_address || '',
        title: d?.title || '',
        entry_fee_category: d?.category || 'Open',
        team: d?.team || '',
      }
    })

    let fide_ids = []
    if (tournament.player_fide_ids) {
      fide_ids = tournament.player_fide_ids.split(',')
    }

    const players = await this.playersDao.findByWhere({
      [Op.or]: where,
    })

    const common = []
    let newPlayers = []
    const invalidPlayer = []
    if (players.length > 0) {
      data.forEach((p) => {
        let MostMatchedPlayer = null
        let j = 0
        while (j < players.length) {
          const r = players[j]
          if (!!p.mobile?.length && r.mobile === p.mobile) {
            if (PlayersService.areNamesSimilar(p.name, r.name)) {
              MostMatchedPlayer = r
              if (p.team) {
                MostMatchedPlayer.team = p.team
              }
              if (p.rating > r.rating) {
                MostMatchedPlayer.rating = p.rating
                this.playersDao.updateById({ rating: p.rating }, r.id)
              }
            } else if (!!p.fide_id && r.fide_id === p.fide_id) {
              invalidPlayer.push(p.name)
            }
            break
          } else if (!!p.fide_id && r.fide_id === p.fide_id) {
            // if (p.name.replace(/[,]/g, '') === r.name.replace(/[,]/g, '')) {
            if (PlayersService.areNamesSimilar(p.name, r.name)) {
              MostMatchedPlayer = r
              if (p.team) {
                MostMatchedPlayer.team = p.team
              }
              if (p.rating > r.rating) {
                MostMatchedPlayer.rating = p.rating
                this.playersDao.updateById({ rating: p.rating }, r.id)
              }
            } else {
              invalidPlayer.push(p.name)
            }
            break
          } else if (p.name === r.name && p.age === r.age) {
            MostMatchedPlayer = r
            if (p.team) {
              MostMatchedPlayer.team = p.team
            }
            if (p.rating > r.rating) {
              MostMatchedPlayer.rating = p.rating
              this.playersDao.updateById({ rating: p.rating }, r.id)
            }
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
    const playerUuids = common.map((p) => {
      return p.uuid
    })

    if (
      !data.length &&
      playerUuids.length &&
      playerUuids.every((id) => {
        return fide_ids.includes(id)
      })
    ) {
      message = 'Players are already registered in this tournament.'
      throw Error(message)
    }

    if (data.length) {
      const result = await this.playersDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        throw Error(message)
      }
    }

    const ids = [
      ...new Set(fide_ids),
      ...new Set(playerUuids),
      ...new Set(
        data.map((r) => {
          return r.uuid
        })
      ),
    ]

    const playerTeamMapping = [...common, ...data].reduce((acc, c) => {
      if (c.team) {
        acc[c.uuid] = c.team
      }
      return acc
    }, {})

    await this.tournamentDao.updateWhere(
      {
        player_fide_ids: ids.join(),
      },
      { id: tournamentId }
    )

    return { ids, invalidPlayer, playerTeamMapping }
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

      const data = await parseFile(filePath, type)

      if (!data.length) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (
        data.length &&
        !['name', 'gender', 'birth_year'].every((x) => {
          return Object.keys(data[0]).includes(x)
        })
      ) {
        message =
          'Name, Gender and Birth Year is mandatory fields! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const { tournamentId } = req.body

      await this.redisService.removeKey(`ccm_players_${tournamentId}`)

      try {
        const { ids, invalidPlayer } = await this.processUniquePlayers(
          data,
          tournamentId
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
      } catch (error) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          error.message
        )
      }
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  uploadSheet = async (req) => {
    try {
      let message
      const filePath = req.file.path
      const { mimetype } = req.file
      const { tournamentId, type } = req.body

      const { results: data, round } = await parseChessResultFile(
        filePath,
        mimetype,
        type
      )

      if (!data.length) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      await this.redisService.removeKey(`ccm_players_${tournamentId}`)

      try {
        if (type === 'players') {
          const { ids, invalidPlayer } = await this.processUniquePlayers(
            data,
            tournamentId
          )
          message = `Successfully uploaded ${ids.length} players`
          if (invalidPlayer.length) {
            message += ` except players with names ${invalidPlayer.join()} due to incorrect Fide Id.`
          }

          const finalData = await this.playersDao.findByWhere({ uuid: ids })

          return responseHandler.returnSuccess(
            httpStatus.CREATED,
            message,
            finalData
          )
        } else if (type === 'team') {
          const { ids, invalidPlayer, playerTeamMapping } =
            await this.processUniquePlayers(data, tournamentId)

          const distinctTeams = new Set(data.map((d) => d.team))
          message = `Successfully uploaded ${ids.length} players`
          if (invalidPlayer.length) {
            message += ` except players with names ${invalidPlayer.join()} due to incorrect Fide Id.`
          }

          const finalData = await this.playersDao.findByWhere({ uuid: ids })
          const teamPlayersMapping = {}

          finalData.forEach((b, i) => {
            const team = playerTeamMapping[b.uuid]

            if (team && teamPlayersMapping[team]) {
              teamPlayersMapping[team] = [...teamPlayersMapping[team], b.uuid]
            } else if (team && !teamPlayersMapping[team]) {
              teamPlayersMapping[team] = [b.uuid]
            }
            b.team = team
          })

          const payload = Object.keys(teamPlayersMapping).map((team) => ({
            tournament_id: tournamentId,
            name: team,
            player_uuids: teamPlayersMapping[team],
          }))
          await this.teamsDao.bulkCreate(payload)
          const result = payload
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((t) => ({
              ...t,
              players: finalData
                .filter((r) => t.player_uuids.includes(r.uuid))
                .map((p, i) => ({ ...p, key: i + 1 })),
            }))
          return responseHandler.returnSuccess(
            httpStatus.CREATED,
            message,
            result
          )
        } else if (type === 'pairings') {
          const whitePlayers = []
          const blackPlayers = []
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
          const players = await this.playersDao.findByWhere({
            uuid: fide_ids.concat(withDrawnIds),
          })

          data.forEach((d) => {
            whitePlayers.push({
              round,
              tournament_id: tournamentId,
              player_uuid: players.find((p) => {
                return p.name === d.white.name
              })?.uuid,
              player_name: d.white.name,
              player_rating: d.white.rating,
              player_score: d.white.score,
              result: d.white.result,
              is_scored: true,
            })
            if (d.black['no.'] !== d.white['no.']) {
              blackPlayers.push({
                round,
                tournament_id: tournamentId,
                player_uuid: players.find((p) => {
                  return p.name === d.black.name
                })?.uuid,
                player_name: d.black.name,
                player_rating: d.black.rating,
                player_score: d.black.score,
                result: d.black.result,
                is_scored: true,
              })
            }
          })

          const res = await this.tournamentPairingDao.bulkCreate(whitePlayers)
          if (!res) {
            message = 'Failed to pair players! Please try again.'
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
          const newOpponents = blackPlayers.map((b, i) => {
            return {
              ...b,
              parent_id: res[i].id,
            }
          })
          const oppRes = await this.tournamentPairingDao.bulkCreate(
            newOpponents
          )

          await this.tournamentDao.updateById(
            { current_round: Number(round) },
            tournamentId
          )

          const finalData = res.map((w, i) => {
            return {
              player: w,
              opponent: oppRes[i] || null,
            }
          })
          return responseHandler.returnSuccess(
            httpStatus.OK,
            message,
            finalData
          )
        }
      } catch (error) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          error.message
        )
      }
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

      const players = await this.playersDao.findByWhere({
        [Op.or]: where,
      })

      let player = null
      let invalidPlayer = false
      let i = 0
      while (i < players.length) {
        const r = players[i]
        if (r.mobile === data.mobile) {
          if (data.name === r.name) {
            player = r
          } else if (!!data.fide_id && r.fide_id === data.fide_id) {
            invalidPlayer = true
          }
          break
        }
        if (!!data.fide_id && r.fide_id === Number(data.fide_id)) {
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
        { id }
      )
      if (!result) {
        message = 'Failed to add player! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      await this.redisService.removeKey(`ccm_players_${id}`)
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
      const redisResult = await this.redisService.getValue(
        `ccm_players_${tournamentId}`
      )
      if (redisResult) {
        return responseHandler.returnSuccess(
          httpStatus.OK,
          message,
          JSON.parse(redisResult)
        )
      }

      let tournament = await this.tournamentDao.findById(tournamentId)

      if (tournament.cct_id) {
        try {
          const newPlayers = await sequelize.query(
            `Select b.player_name as name,
          a.category as category,
          b.mobile_number as mobile_number,
          b.sex as gender,
          b.fide_id as fide_id,
          (select fide_title from fide_player_profile c where c.fide_id=b.fide_id) as title,
          CASE
              WHEN b.fide_id > 0 THEN (select current_rapid_rating from fide_player_profile c where c.fide_id=b.fide_id)
              ELSE 0
          END AS rating, 
          CASE
              WHEN b.dob is null THEN (select birth_year from fide_player_profile c where c.fide_id=b.fide_id)::text
              WHEN b.dob = '' THEN (select birth_year from fide_player_profile c where c.fide_id=b.fide_id)::text
              ELSE RIGHT(b.dob,4)
          END AS birth_year 
          from cc_registration_orders as a join tournament_notification_registrations as b on a.player_id=b.id where a.tournament_id=${tournament.cct_id};`,
            {
              type: sequelize.QueryTypes.SELECT,
            }
          )
          const { ids, invalidPlayer } = await this.processUniquePlayers(
            newPlayers,
            tournamentId,
            true
          )
          let msg = `Successfully uploaded ${ids.length} players`
          if (invalidPlayer.length) {
            msg += ` except players with names ${invalidPlayer.join()} due to incorrect Fide Id.`
          }
          logger.info(msg)
        } catch (error) {
          logger.error(error)
        }
      }

      tournament = await this.tournamentDao.findById(tournamentId)

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

      let result = sortByInitialRankings(data)
        .map((p) => {
          return {
            ...p,
            isWithDrawn: withDrawnIds.includes(p.uuid),
          }
        })
        .sort((a, b) => {
          return b.isWithDrawn ? -1 : 1
        })

      if (tournament.pairing_type === 'Team') {
        const teams = await this.teamsDao.findByWhere({
          tournament_id: tournamentId,
        })

        result = teams
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => ({
            ...t,
            players: result
              .filter((r) => t.player_uuids.includes(r.uuid))
              .map((p, i) => ({ ...p, key: i + 1 })),
          }))
      }

      await this.redisService.setValue(
        `ccm_players_${tournamentId}`,
        JSON.stringify(result)
      )
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
    } catch (e) {
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

      const { tournamentId } = req.body
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })

      data = data
        .filter((d) => {
          return !players.some((p) => {
            return p.mobile_number === d.mobile_number || p.name === d.name
          })
        })
        .map((e) => {
          return { ...e, tournament_id: tournamentId }
        })

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
   * @param {Number} tournamentId
   * @param {Object} user
   * @returns {Object}
   */

  createJuspayPayout = async (tournamentId, user) => {
    try {
      let message
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })
      const tournament = await this.tournamentDao.findById(tournamentId)
      if (
        !players.some((p) => {
          return p.upi_id.length || p.amount > 0
        })
      ) {
        message =
          'Amount should be greater than 0 and UPI Id should be available for all players!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const random5char = Math.random().toString(36).substr(2, 5)
      const data = {
        orderId: `PAYOUT${moment().format('YYYYMM')}${random5char}`,
        fulfillments: players
          .filter((p) => {
            return !p.status || ['FAIL', 'FAILURE'].includes(p.status)
          })
          .map((p) => {
            return {
              amount: p.amount,
              beneficiaryDetails: {
                details: {
                  name: p.name,
                  vpa: p.upi_id,
                },
                type: 'UPI_ID',
              },
              additionalInfo: {
                remark: p.remarks,
              },
            }
          }),
        amount: players
          .filter((p) => {
            return !p.status || ['FAIL', 'FAILURE'].includes(p.status)
          })
          .reduce((t, s) => {
            return t + s.amount
          }, 0),
        customerId: String(user.id),
        customerPhone: user.phone_number,
        customerEmail: user.email,
        type: 'FULFILL_ONLY',
        udf1: '',
        udf2: '',
        udf3: '',
        udf4: '',
        udf5: '',
      }

      const juspayResponse = await this.juspayService.createPayout(data)

      const updateData = { order_id: juspayResponse.orderId }
      if (tournament.order_id) {
        const previousOrderIds = tournament.previous_order_ids
          ? JSON.parse(tournament.previous_order_ids)
          : []
        previousOrderIds.push(tournament.order_id)
        updateData.previous_order_ids = JSON.stringify(previousOrderIds)
      }
      await this.tournamentDao.updateById(updateData, tournamentId)
      const promises = players
        .filter((p) => {
          return !p.status || ['FAIL', 'FAILURE'].includes(p.status)
        })
        .map((s, i) => {
          return this.playersPrizePayoutDao.updateById(
            {
              fulfillment_id: juspayResponse.fulfillments[i].id,
              status: 'INITIATED',
            },
            s.id
          )
        })

      await Promise.allSettled(promises)

      message =
        'Payout to all players have been inititated succesfully. You can check the status in the table.!'

      return responseHandler.returnSuccess(
        httpStatus.OK,
        message,
        juspayResponse
      )
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(httpStatus.BAD_REQUEST, e.message)
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
        if (tournament.withdrawn_uuid) {
          withDrawn_ids = tournament.withdrawn_uuid.split(',')
        }

        if (playerBody.is_withdrawn) {
          fide_ids = fide_ids.filter((id) => {
            return id !== playerBody.uuid
          })
          withDrawn_ids.push(playerBody.uuid)
        } else {
          message = 'Successfully added player again for this tournament.'
          fide_ids.push(playerBody.uuid)
          withDrawn_ids = withDrawn_ids.filter((id) => {
            return id !== playerBody.uuid
          })
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
      await this.redisService.removeKey(
        `ccm_players_${playerBody.tournamentId}`
      )
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

      const player = await this.playersDao.findOneByWhere({ uuid })

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
        where.tournament_id = tournamentId
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
          tournaments: tournaments.filter((t) => {
            return !(
              t.result ===
                data.find((p) => {
                  return p.parent_id === t.id || t.parent_id === p.id
                })?.result && Number(t.result) === 0
            )
          }),
        },
        opponents: data.filter((t) => {
          return !(
            t.result ===
              tournaments.find((p) => {
                return p.parent_id === t.id || t.parent_id === p.id
              })?.result && Number(t.result) === 0
          )
        }),
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
