/* eslint-disable no-param-reassign */
const httpStatus = require('http-status')
const { Op } = require('sequelize')
const moment = require('moment')
const levenshtein = require('fast-levenshtein')
const PlayersDao = require('../dao/PlayersDao')
const TeamsDao = require('../dao/TeamsDao')
const TournamentPlayersDao = require('../dao/TournamentPlayersDao')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const PayoutTransactionsDao = require('../dao/PayoutTransactionsDao')
const TournamentDao = require('../dao/TournamentDao')
const TournamentPairingDao = require('../dao/TournamentPairingDao')
const PrizeCategoryDao = require('../dao/PrizeCategoryDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const { parseFile, parseChessResultFile } = require('../helper/parseFile')
const { sequelize } = require('../models')
const { sortByInitialRankings } = require('../helper/pairingEngine/swiss')
const JuspayService = require('./JuspayService')
const RedisService = require('./RedisService')
const CCUserDao = require('../dao/CCUserDao')
const { getFilterBasedOnOperator } = require('../helper/utils')

class PlayersService {
  constructor() {
    this.playersDao = new PlayersDao()
    this.trnplayersDao = new TournamentPlayersDao()
    this.teamsDao = new TeamsDao()
    this.tournamentDao = new TournamentDao()
    this.tournamentPairingDao = new TournamentPairingDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
    this.juspayService = new JuspayService()
    this.redisService = new RedisService()
    this.payoutTransactionsDao = new PayoutTransactionsDao()
    this.CCUserDao = new CCUserDao()
    this.prizeCategoryDao = new PrizeCategoryDao()
  }

  static getRatingToConsider = (tournamentType, ratings) => {
    const fallbackOrder = {
      classical: ['rating'],
      rapid: ['rapid_rating', 'rating'],
      blitz: ['blitz_rating', 'rating'],
    }

    const order = fallbackOrder[tournamentType.toLowerCase()]
    const rating = order.find((type) => {
      return ratings[type] !== 0 && ratings[type]
    })
    return rating || 0 // No rating available
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

  static CSOCTournamentMapping = {
    advance: 16599,
    intermediate: '19538,29210',
    foundation: '24797,23696,28545',
    beginner: 19526,
  }

  static CSOCTournamentClassNameMapping = {
    advance: '-P%-AD',
    intermediate: '-P%-IN',
    foundation: '-P%-F',
    beginner: '-P%-B',
  }

  static areNamesSimilar = (_name1, _name2, threshold = 0.1) => {
    // Convert names to lowercase for case-insensitive comparison
    const name1 = _name1.toLowerCase()
    const name2 = _name2.toLowerCase()

    // Calculate the Levenshtein distance
    const distance = levenshtein.get(name1, name2)
    const maxLen = Math.max(name1.length, name2.length)
    const normalizedDistance = maxLen > 0 ? distance / maxLen : 0

    // Check if the normalized distance is less than or equal to the threshold
    return normalizedDistance <= threshold
  }

  static cleanName = (rawName) => {
    return rawName
      .normalize('NFKD') // Normalize Unicode
      .replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
      .replace(/[^a-zA-Z0-9 .'-]/g, '') // Remove weird characters
      .trim() // Remove leading/trailing spaces
  }

  processUniquePlayers = async (input, tournamentId, isChatbot = false) => {
    let message = ''
    let data = input
    const tournament = await this.tournamentDao.findById(tournamentId)
    const fidePlayers = await this.playersDao.findByWhere({
      fide_id: data
        .filter((d) => {
          return Number(d?.fide_id) > 0
        })
        .map((x) => {
          return Number(x.fide_id)
        }),
    })

    const fidePlayerNames = fidePlayers.reduce((a, b) => {
      a[b.fide_id] = b.name
      return a
    }, {})

    data = data
      .filter((x) => {
        return x?.name?.length > 0
      })
      .map((d) => {
        return {
          name: fidePlayerNames[d.fide_id]
            ? fidePlayerNames[d.fide_id]
            : PlayersService.cleanName(d.name),
          fide_id: Number(d?.fide_id) || null,
          rating: Number(d.rating) || 0,
          gender: PlayersService.parseGender(d.gender),
          registered_from: isChatbot ? 'Chatbot' : 'CCM',
          age: d?.age
            ? d.age
            : moment(tournament.start_date).year() -
              Number(d?.birth_year || 2000),
          mobile: d?.mobile_number || '',
          upi_id: d?.upi_address || '',
          title: d?.title || '',
          entry_fee_category: d?.category || 'Open',
          team: d?.team || '',
          pId: d?.['no.'] || 0,
          tournament_id: tournamentId,
        }
      })

    const players = await this.trnplayersDao.findByWhere({
      tournament_id: tournamentId,
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
              if (p.pId) {
                MostMatchedPlayer.pId = p.pId
              }
              // if (p.rating !== r.rating) {
              //   MostMatchedPlayer.rating = p.rating
              //   this.trnplayersDao.updateById({ rating: p.rating }, r.id)
              // }
            } else if (!!p.fide_id && r.fide_id === p.fide_id) {
              invalidPlayer.push(p.name)
            }
          } else if (!!p.fide_id && r.fide_id === p.fide_id) {
            // if (p.name.replace(/[,]/g, '') === r.name.replace(/[,]/g, '')) {
            if (PlayersService.areNamesSimilar(p.name, r.name)) {
              MostMatchedPlayer = r
              if (p.team) {
                MostMatchedPlayer.team = p.team
              }
              if (p.pId) {
                MostMatchedPlayer.pId = p.pId
              }
              // if (p.rating !== r.rating) {
              //   MostMatchedPlayer.rating = p.rating
              //   this.trnplayersDao.updateById({ rating: p.rating }, r.id)
              // }
            } else {
              invalidPlayer.push(p.name)
            }
            break
          } else if (p.name === r.name && p.age === r.age) {
            MostMatchedPlayer = r
            if (p.team) {
              MostMatchedPlayer.team = p.team
            }
            if (p.pId) {
              MostMatchedPlayer.pId = p.pId
            }
            // if (p.rating > r.rating) {
            //   MostMatchedPlayer.rating = p.rating
            //   this.trnplayersDao.updateById({ rating: p.rating }, r.id)
            // }
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

    const teamMappingByName = data.reduce((a, b) => {
      a[b.name] = b.team
      return a
    }, {})

    if (!data.length && common.length) {
      message = 'Players are already registered in this tournament.'
      throw Error(message)
    }

    let result = []
    if (data.length) {
      result = await this.trnplayersDao.bulkCreate(data)
      await this.tournamentDao.updateById(
        { new_player_added: true },
        tournamentId
      )

      // result = result.dataValues
      if (!result.length) {
        message = 'Failed to upload players! Please try again.'
        throw Error(message)
      }
    }

    const ids = [
      ...new Set(
        [...result, ...common].map((r) => {
          return r.id
        })
      ),
    ]

    const playerTeamMapping = {}
    const playerUuidMapping = {}
    common.concat(result).forEach((p) => {
      if (teamMappingByName[p.name]) {
        playerTeamMapping[p.id] = teamMappingByName[p.name]
      }
      if (p.pId) {
        playerUuidMapping[p.pId] = p.id
      }
    })

    this.redisService.setValueWithExpiry(
      `cr_players_${tournamentId}`,
      43200,
      JSON.stringify(playerUuidMapping)
    ) // 5 days expiry

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

      // if (
      //   data.length &&
      //   !['name', 'gender', 'birth_year'].every((x) => {
      //     return Object.keys(data[0]).includes(x)
      //   })
      // ) {
      //   message =
      //     'Name, Gender and Birth Year is mandatory fields! Please upload again with correct format.'
      //   return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      // }
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

        const finalData = await this.trnplayersDao.findByWhere({
          tournament_id: tournamentId,
        })

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

          const finalData = await this.trnplayersDao.findByWhere({
            tournament_id: tournamentId,
          })

          return responseHandler.returnSuccess(
            httpStatus.CREATED,
            message,
            finalData
          )
        }
        if (type === 'team') {
          const { ids, invalidPlayer, playerTeamMapping } =
            await this.processUniquePlayers(data, tournamentId)

          // const distinctTeams = new Set(data.map((d) => {return d.team}))
          message = `Successfully uploaded ${ids.length} players`
          if (invalidPlayer.length) {
            message += ` except players with names ${invalidPlayer.join()} due to incorrect Fide Id.`
          }

          const finalData = await this.trnplayersDao.findByWhere({
            tournament_id: tournamentId,
          })

          const teamPlayersMapping = {}

          finalData.forEach((b) => {
            const team = playerTeamMapping[b.id]

            if (team && teamPlayersMapping[team]) {
              teamPlayersMapping[team] = [...teamPlayersMapping[team], b.id]
            } else if (team && !teamPlayersMapping[team]) {
              teamPlayersMapping[team] = [b.id]
            }
            b.team = team
          })

          const payload = Object.keys(teamPlayersMapping).map((team) => {
            return {
              tournament_id: tournamentId,
              name: team,
              player_uuids: teamPlayersMapping[team],
            }
          })
          await this.teamsDao.bulkCreate(payload)
          const result = payload
            .sort((a, b) => {
              return a.name.localeCompare(b.name)
            })
            .map((t) => {
              return {
                ...t,
                players: finalData
                  .filter((r) => {
                    return t.player_uuids.includes(r.id)
                  })
                  .map((p, i) => {
                    return { ...p, key: i + 1 }
                  }),
              }
            })
          return responseHandler.returnSuccess(
            httpStatus.CREATED,
            message,
            result
          )
        }
        if (type === 'pairings') {
          const whitePlayers = []
          const blackPlayers = []
          const players = await this.trnplayersDao.findByWhere({
            tournament_id: tournamentId,
          })

          if (!players) {
            message = 'No players exist for this tournament!'
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }

          // const fide_ids = tournament.player_fide_ids.split(',')
          // let withDrawnIds = []
          // if (tournament.withdrawn_uuid) {
          //   withDrawnIds = tournament.withdrawn_uuid.split(',')
          // }
          // const players = await this.playersDao.findByWhere({
          //   uuid: fide_ids.concat(withDrawnIds),
          // })

          const playerUuidMapping = JSON.parse(
            this.redisService.getValue(`cr_players_${tournamentId}`)
          )

          data.forEach((d) => {
            whitePlayers.push({
              round,
              tournament_id: tournamentId,
              player_id:
                playerUuidMapping[d.white?.['no.']] ||
                players.find((p) => {
                  return (
                    PlayersService.areNamesSimilar(p?.name, d?.white?.name) ||
                    p?.rating === d?.white?.rating
                  )
                })?.id,
              player_name: d.white.name,
              player_rating: d.white.rating,
              player_score: d.white.score,
              result: d.white.result,
              is_scored: true,
            })
            if (!['bye', 'not paired'].includes(d?.black?.name)) {
              blackPlayers.push({
                round,
                tournament_id: tournamentId,
                player_id:
                  playerUuidMapping[d.black?.['no.']] ||
                  players.find((p) => {
                    return (
                      PlayersService.areNamesSimilar(p?.name, d?.black?.name) ||
                      p?.rating === d?.black?.rating
                    )
                  })?.id,
                player_name: d.black.name,
                player_rating: d.black.rating,
                player_score: d.black.score,
                result: d.black.result,
                is_scored: true,
              })
            }
          })

          const res = await this.tournamentPairingDao.bulkCreate(whitePlayers)
          // console.log(blackPlayers[0], res[0].dataValues)
          if (!res) {
            message = 'Failed to pair players! Please try again.'
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
          const newOpponents = blackPlayers.map((b, i) => {
            return {
              ...b,
              parent_id: res[i].dataValues.id,
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

      let payload
      if (Array.isArray(body)) {
        payload = body.map((e) => {
          return { ...e, registered_from: 'CCM' }
        })
      } else {
        const data = {
          ...body,
          title: body.title || '',
          registered_from: 'CCM',
        }
        payload = [data]
      }

      const { ids, invalidPlayer } = await this.processUniquePlayers(
        payload,
        id
      )

      if (invalidPlayer.length > 0) {
        message = 'Player already exists with same Fide Id.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (!ids.length) {
        message = 'Failed to add player! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      this.redisService.removeKey(`ccm_players_${id}`)
      return responseHandler.returnSuccess(httpStatus.CREATED, message, payload)
    } catch (e) {
      return responseHandler.returnError(httpStatus.BAD_REQUEST, e.message)
    }
  }

  joinTournament = async (id, body) => {
    try {
      let message = 'Successfully added player.'

      const data = { ...body }
      const tournament = await this.tournamentDao.findById(id)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',')
      }

      console.log('Inside joinTournament', tournament, fide_ids)

      const user = await this.CCUserDao.findOne({ user_id: data.playerId })

      if (PlayersService.CSOCTournamentMapping[tournament.csoc_batch]) {
        const res = await sequelize.query(
          `select id from cc_csoc_registration where status in (1,3) and mobile_number='${
            user.mobile_number
          }' and tournament_id in (${
            PlayersService.CSOCTournamentMapping[tournament.csoc_batch]
          })`,
          {
            type: sequelize.QueryTypes.SELECT,
          }
        )

        if (!res.length) {
          const res1 = await sequelize.query(
            `select id from cc_csoc_registration where status in (1,3) and mobile_number='${
              user.mobile_number
            }' and class_name like '%${
              PlayersService.CSOCTournamentClassNameMapping[
                tournament.csoc_batch
              ]
            }%'`,
            {
              type: sequelize.QueryTypes.SELECT,
            }
          )
          if (!res1.length) {
            message =
              "Failed to add player! Since Player doesn't belongs to respective CSOC batch."
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
        }
      }

      if (!user) {
        throw new Error(`User with user_id ${data.playerId} not found`)
      }

      let age = 0
      if (user.dob) {
        const dob = moment(user.dob)
        const tournamentStartDate = moment(tournament.start_date)
        age = tournamentStartDate.diff(dob, 'years')
      }

      // Check if player already exists
      const existingPlayer = await this.trnplayersDao.findOne({
        tournament_id: id,
        cc_userid: data.playerId,
      })

      if (existingPlayer) {
        // If the player exists and was withdrawn, set is_withdrawn to false
        if (existingPlayer.is_withdrawn) {
          await this.trnplayersDao.updateById(
            { is_withdrawn: false },
            existingPlayer.id
          )

          let ids = fide_ids
          ids.push(existingPlayer.cc_userid)
          ids = [...new Set(ids)]

          await this.tournamentDao.updateWhere(
            { player_fide_ids: ids.join() },
            { id }
          )

          // Update is_withdrawn in tournamentPairingDao if the user rejoins
          await this.tournamentPairingDao.updateWhere(
            { is_withdrawn: false },
            {
              tournament_id: id,
              cc_userid: data.playerId,
            }
          )

          message = 'Player rejoined the tournament.'
          return responseHandler.returnSuccess(
            httpStatus.OK,
            message,
            existingPlayer
          )
        }

        message = 'Player is already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      // Populate player data
      const playerData = {
        name: user.username || '',
        fide_id: Number(user.fide_id) || null,
        rating: Number(user.gameplay_rating) || 0,
        gender: '',
        registered_from: 'Learn',
        age,
        mobile: user.mobile_number || '',
        upi_id: user.upi_address || '',
        title: user.title || '',
        entry_fee_category: '',
        team: '',
        pId: user.pId || 0,
        tournament_id: id,
        cc_userid: data.playerId,
      }

      const player = await this.trnplayersDao.create(playerData)

      let ids = fide_ids
      ids.push(player.cc_userid)
      ids = [...new Set(ids)]

      const result = await this.tournamentDao.updateWhere(
        { player_fide_ids: ids.join() },
        { id }
      )

      if (!result) {
        message = 'Failed to add player! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.CREATED, message, player)
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
      // const redisResult = await this.redisService.getValue(
      //   `ccm_players_${tournamentId}`
      // )
      // if (redisResult) {
      //   return responseHandler.returnSuccess(
      //     httpStatus.OK,
      //     message,
      //     JSON.parse(redisResult)
      //   )
      // }

      let tournament = await this.tournamentDao.findById(tournamentId)

      let ratingType
      switch (tournament.time_format) {
        case 'Blitz':
          ratingType = 'blitz_rating'
          break
        case 'Rapid':
          ratingType = 'rapid_rating'
          break
        default:
          ratingType = 'rating'
      }

      if (tournament.cct_id && tournament.enable_registration) {
        try {
          const newPlayers = await sequelize.query(
            `Select 
          CASE
              WHEN b.fide_id > 0 THEN (select name from players c where c.fide_id=b.fide_id)
              ELSE b.player_name
          END as name,
          a.category as category,
          b.mobile_number as mobile_number,
          b.sex as gender,
          b.fide_id as fide_id,
          (select title from players c where c.fide_id=b.fide_id) as title,
          COALESCE(
              (select ${ratingType} from players c where c.fide_id=b.fide_id),
              (select rating from players c where c.fide_id=b.fide_id),
              0
          ) AS rating, 
          CASE
              WHEN b.dob is null THEN (select birth_year from players c where c.fide_id=b.fide_id)::text
              WHEN b.dob = '' THEN (select birth_year from players c where c.fide_id=b.fide_id)::text
              ELSE RIGHT(b.dob,4)
          END AS birth_year 
          from cc_registration_orders as a join tournament_notification_registrations as b on a.player_id=b.id where a.tournament_id=${tournament.cct_id} and a.cancelled=0;`,
            {
              type: sequelize.QueryTypes.SELECT,
            }
          )

          const splitTournaments = await this.tournamentDao.findByWhere({
            parent_id: tournamentId,
          })

          if (splitTournaments?.length > 0) {
            const promises = splitTournaments.map(async (t) => {
              const category = await this.prizeCategoryDao.findById(
                t.category_id
              )
              const filteredPlayers = newPlayers.filter((p) => {
                return (
                  getFilterBasedOnOperator(
                    category.operator,
                    {
                      rating: p.rating,
                      age:
                        moment(tournament.start_date).year() -
                        Number(p?.birth_year),
                    },
                    category.type,
                    category.value
                  ) && p.gender === category.gender
                )
              })
              return this.processUniquePlayers(filteredPlayers, t.id, true)
            })
            await Promise.allSettled(promises)
          }
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

      const data = await this.trnplayersDao.findByWhere({
        tournament_id: tournamentId,
      })

      tournament = await this.tournamentDao.findById(tournamentId)

      if (!data.length) {
        message = 'No players exist for this tournament!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let result = data
        .map((p) => {
          return {
            ...p,
            isWithDrawn: p.is_withdrawn,
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
          .sort((a, b) => {
            return a.name.localeCompare(b.name)
          })
          .map((t) => {
            return {
              ...t,
              players: result
                .filter((r) => {
                  return t.player_uuids.includes(r.id)
                })
                .map((p, i) => {
                  return { ...p, key: i + 1 }
                }),
            }
          })
      }

      // this.redisService.setValue(
      //   `ccm_players_${tournamentId}`,
      //   JSON.stringify(result)
      // )
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

      const data = await this.trnplayersDao.updateById(playerBody, playerId)

      if (!data.length) {
        message = 'Players details failed to update.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      await this.redisService.removeKey(
        `ccm_players_${playerBody.tournamentId}`
      )
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
      const { tournamentId, payload } = req.body
      let data
      const players = await this.playersPrizePayoutDao.findByWhere({
        tournament_id: tournamentId,
      })
      if (req?.file?.path) {
        const filePath = req.file.path
        const type = req.file.mimetype
        data = await parseFile(filePath, type)
        if (!data) {
          message =
            'Failed to parse data from file! Please upload again with correct format.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
      } else {
        data = [payload]
      }

      if (Number(tournamentId) !== 1) {
        data = data.filter((d) => {
          return !players.some((p) => {
            return p.mobile_number === d.mobile_number || p.name === d.name
          })
        })
      }

      data = data.map((e) => {
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
  getPrizeWinningPlayers = async (tournamentId, type) => {
    try {
      let message = 'Successfully fetched players for tournament.'
      const where = {
        tournament_id: tournamentId,
      }
      if (type === 'new') {
        where.fulfillment_id = null
      } else if (type === 'history') {
        where.fulfillment_id = {
          [Op.ne]: null,
        }
      }
      const players = await this.playersPrizePayoutDao.findByWhere(where)

      if (!players) {
        message = 'No players exist for this tournament!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const messageData = await this.payoutTransactionsDao.findByWhere(
        {
          fulfillmentId: players.map((p) => {
            return p.fulfillment_id
          }),
        },
        ['responseMessage', 'fulfillmentId']
      )

      const data = players.map((p) => {
        return {
          ...p,
          ...(['FAIL', 'FAILURE', 'PENDING'].includes(p.status) && {
            message: messageData.find((m) => {
              return m.fulfillmentId === p.fulfillment_id
            })?.responseMessage,
          }),
        }
      })

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
      const filter = (p) => {
        return tournamentId === 1
          ? !p.status
          : !p.status || ['FAIL', 'FAILURE'].includes(p.status)
      }
      const data = {
        orderId: `PAYOUT${moment().format('YYYYMM')}${random5char}`,
        fulfillments: players
          .filter((p) => {
            return filter(p)
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
            return filter(p)
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
          return filter(p)
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

      // const tournament = await this.tournamentDao.findById(
      //   playerBody.tournamentId
      // )

      // if (tournament.player_fide_ids) {
      //   let fide_ids = tournament.player_fide_ids.split(',')
      //   let withDrawn_ids = []
      //   if (tournament.withdrawn_uuid) {
      //     withDrawn_ids = tournament.withdrawn_uuid.split(',')
      //   }

      //   if (playerBody.is_withdrawn) {
      //     fide_ids = fide_ids.filter((id) => {
      //       return id !== playerBody.uuid
      //     })
      //     withDrawn_ids.push(playerBody.uuid)
      //   } else {
      //     message = 'Successfully added player again for this tournament.'
      //     fide_ids.push(playerBody.uuid)
      //     withDrawn_ids = withDrawn_ids.filter((id) => {
      //       return id !== playerBody.uuid
      //     })
      //   }
      // }
      const player = await this.trnplayersDao.findById(playerBody.id)
      const result = await this.trnplayersDao.updateById(
        {
          is_withdrawn: playerBody.is_withdrawn,
        },
        playerBody.id
      )
      if (!result) {
        message = 'Failed to withdraw player from this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      if (result) {
        if (playerBody.round > 0) {
          const data = await this.tournamentPairingDao.updateWhere(
            { is_withdrawn: playerBody.is_withdrawn },
            {
              tournament_id: playerBody.tournamentId,
              round: playerBody.round,
              player_id: playerBody.id,
            }
          )

          if (!data) {
            message = 'Failed to withdraw player from this tournament.'
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
        }
        console.log('player', JSON.stringify(player))
        // Remove the withdrawn player's cc_userid from fide_ids if tournament type is 'Cieclechess_Online'
        const tournament = await this.tournamentDao.findById(
          playerBody.tournamentId
        )
        if (
          tournament &&
          tournament.tournament_type === 'Circlechess_Online' &&
          tournament.player_fide_ids
        ) {
          let fide_ids = tournament.player_fide_ids.split(',')
          fide_ids = fide_ids.filter((id) => {
            return id !== player.cc_userid.toString()
          })

          await this.tournamentDao.updateWhere(
            { player_fide_ids: fide_ids.join() },
            { id: playerBody.tournamentId }
          )
        }

        this.redisService.removeKey(`ccm_players_${playerBody.tournamentId}`)
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

      const player = await this.trnplayersDao.findById(uuid)

      if (!player) {
        message = 'Failed to fetch player details.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let query = `select * from ccm_tournament_pairings where (parent_id in (select id from ccm_tournament_pairings where player_id='${uuid}') or 
      id in (select parent_id from ccm_tournament_pairings where player_id='${uuid}'))`

      const where = {
        player_id: uuid,
      }
      let tournamentName = ''

      if (tournamentId) {
        query += ` and tournament_id=${tournamentId} `
        where.tournament_id = tournamentId
        const tournament = await this.tournamentDao.findById(tournamentId)
        tournamentName = tournament.name
      }

      const tournaments = await this.tournamentPairingDao.findByWhere(where)
      query += ' order by tournament_id, round'

      const data = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT,
      })

      const result = {
        tournamentName,
        details: {
          ...player,
          tournaments: tournaments.filter((t) => {
            return !(
              t.result ===
                data.find((p) => {
                  return p.parent_id === t.id || t.parent_id === p.id
                })?.result && t.result === ''
            )
          }),
        },
        opponents: data.filter((t) => {
          return !(
            t.result ===
              tournaments.find((p) => {
                return p.parent_id === t.id || t.parent_id === p.id
              })?.result && t.result === ''
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

  searchFidePlayers = async ({
    fideId,
    name,
    rating,
    blitz_rating,
    rapid_rating,
    year,
    gender,
  }) => {
    try {
      const message = 'Found players based on search input'
      const where = {}
      if (name?.length) {
        where.name = { [Op.iLike]: `%${name}%` }
      }
      if (fideId) {
        where.fide_id = fideId
      }
      if (gender.length) {
        where.gender = gender
      }
      if (Object.keys(rating).length) {
        if (rating.min && rating.max) {
          where.rating = { [Op.between]: [rating?.min, rating?.max] }
        } else if (rating.min) {
          where.rating = { [Op.gte]: rating.min }
        } else {
          where.rating = { [Op.lte]: rating.max }
        }
      }
      if (Object.keys(blitz_rating).length) {
        if (blitz_rating.min && blitz_rating.max) {
          where.blitz_rating = {
            [Op.between]: [blitz_rating?.min, blitz_rating?.max],
          }
        } else if (blitz_rating.min) {
          where.blitz_rating = { [Op.gte]: blitz_rating.min }
        } else {
          where.blitz_rating = { [Op.lte]: blitz_rating.max }
        }
      }
      if (Object.keys(rapid_rating).length) {
        if (rapid_rating.min && rapid_rating.max) {
          where.rapid_rating = {
            [Op.between]: [rapid_rating?.min, rapid_rating?.max],
          }
        } else if (rapid_rating.min) {
          where.rapid_rating = { [Op.gte]: rapid_rating.min }
        } else {
          where.rapid_rating = { [Op.lte]: rapid_rating.max }
        }
      }
      if (year?.min) {
        where.age = {
          [Op.between]: [
            moment().year() - Number(year?.max) || 0,
            moment().year() - year.min,
          ],
        }
      }
      const result = await this.playersDao.findByWhere(
        where,
        null,
        ['rating', 'desc'],
        10
      )
      if (!result) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'No macthing players!'
        )
      }
      const data = result.reduce((acc, curr) => {
        acc.push({ ...curr, rating_type: 'Standard' })
        if (Number(curr?.rapid_rating) > 0) {
          acc.push({
            ...curr,
            rating_type: 'Rapid',
            rating: curr?.rapid_rating,
          })
        }
        if (Number(curr?.blitz_rating) > 0) {
          acc.push({
            ...curr,
            rating_type: 'Blitz',
            rating: curr?.blitz_rating,
          })
        }
        return acc
      }, [])
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  syncFidePlayers = async (tournamentId) => {
    try {
      let message = 'Sync all players based on fide data'
      const fide_players = await this.trnplayersDao.findByWhere(
        {
          tournament_id: tournamentId,
          fide_id: {
            [Op.ne]: null,
          },
        },
        ['fide_id']
      )
      if (!fide_players.length) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'No players found to sync!'
        )
      }
      const fideIds = fide_players.map((p) => {
        return p.fide_id
      })
      const players = await this.playersDao.findByWhere({
        fide_id: {
          [Op.in]: fideIds,
        },
      })
      if (!players.length) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'No players found to sync!'
        )
      }
      const tournament = await this.tournamentDao.findById(tournamentId)
      const promises = players.map((p) => {
        return this.trnplayersDao.updateWhere(
          {
            name: p.name,
            rating: PlayersService.getRatingToConsider(
              tournament.time_format,
              p
            ),
            title: p.title,
            age: p.age,
            gender: p.gender,
          },
          { fide_id: p.fide_id }
        )
      })
      await Promise.allSettled(promises)
      const data = await this.trnplayersDao.findByWhere({
        tournament_id: tournamentId,
      })

      if (!data.length) {
        message = 'No players exist for this tournament!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const result = data
        .map((p) => {
          return {
            ...p,
            isWithDrawn: p.is_withdrawn,
          }
        })
        .sort((a, b) => {
          return b.isWithDrawn ? -1 : 1
        })
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
