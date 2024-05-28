/* eslint-disable no-param-reassign */
const httpStatus = require('http-status')
const { Op, literal } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const sharp = require('sharp')
const fetch = require('node-fetch')
const TournamentDao = require('../dao/TournamentDao')
const CCTournamentFeedbackDao = require('../dao/CcTournamentFeedback')
const PlayersDao = require('../dao/PlayersDao')
const TournamentPairingsDao = require('../dao/TournamentPairingDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const { sequelize } = require('../models')
const { userRoles } = require('../config/constant')
const { javaFoRoundPairing } = require('../helper/swiss')
const getTieBreaks = require('../helper/tieBreakers')
const UserService = require('./UserService')
const PrizeCategoryDao = require('../dao/PrizeCategoryDao')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const TournamentPrizeCategoryMappingDao = require('../dao/TournamentCategoryMappingDao')
const parseFile = require('../helper/parseFile')
// const fetchLatestFidePlayers = require('../helper/fidePlayers')

class TournamentService {
  constructor() {
    this.tournamentDao = new TournamentDao()
    this.prizeCategoryDao = new PrizeCategoryDao()
    this.tournamentPrizeMappingDao = new TournamentPrizeCategoryMappingDao()
    this.playersDao = new PlayersDao()
    this.tournamentPairingsDao = new TournamentPairingsDao()
    this.ccTournamentFeedbackDao = new CCTournamentFeedbackDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
    this.userService = new UserService() // This is specifically to for querying the lichess token information from DB
  }

  createLichessSwissTournament = async (tournamentBody, req) => {
    try {
      // Creating lichess arena tournament
      // Arena payload looks as below:
      /*
      {
        arbiter: "M Venkatesan"
         description: "Test Description"
         duration: 7
        entry_fee: 500
        increment_time: "5"
         initial_time: "10"
        name: "ACC National Open Blitz Tournament"
         organizer: "Alekhines Chess Club"
         rated: true
         startDate: Object { "$L": "en", "$y": 2023, "$M": 7, … }
         startTime: undefined
      }
      */

      try {
        let message = 'Successfully created tournament.'
        if (req.user.role !== userRoles.ORGANIZER) {
          message =
            'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        // fetch the lichess token
        let lichess_bearer_token = 'Bearer '
        const lichess_username = req.user.lic_name
        if (lichess_username) {
          const lichessUser = await this.userService.getLichessUserById(
            lichess_username
          )
          if (lichessUser && lichessUser.lichess_token) {
            // the user has lichess account integrated
            // TODO: Here we should put an additional logic to validate the token
            lichess_bearer_token += lichessUser.lichess_token
          } else {
            return responseHandler.returnError(
              httpStatus.BAD_REQUEST,
              'You dont have a connected Lichess account'
            )
          }
        } else {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'You dont have a connected Lichess account'
          )
        }

        tournamentBody.created_by = req.user.id
        tournamentBody.is_active = true

        const lichessRequestBody = {
          name: tournamentBody.name,
          'clock.limit': tournamentBody.initial_time,
          'clock.increment': tournamentBody.increment_time,
          nbRounds: tournamentBody.rounds,
          startsAt: tournamentBody.startDate,
          variant: 'standard',
          rated: tournamentBody.rated,
          berserkable: false, // Should this be true
          streakable: false, // Should this be true
          hasChat: true,
          description: tournamentBody.description,
          // password: Should we have the tournament password here?
        }

        const name_len = tournamentBody.name?.length

        if (name_len && name_len > 30) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name cannot exceed 30 characters'
          )
        }

        // Options to be given as parameter
        // in fetch for making requests
        // other then GET
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // The authorization token has to be picked from the DB
            Authorization: lichess_bearer_token,
            Accept: 'application/json',
          },
          body: new URLSearchParams(lichessRequestBody),
        }

        let lichessUrl = ''

        try {
          const lichessResponse = await fetch(
            'https://lichess.org/api/swiss/new/circlechess',
            options
          )
          const json = await lichessResponse.json()
          console.log(json)
          if (!json.id) {
            if (json.global && json.global.length > 0) {
              responseHandler.returnError(
                httpStatus.BAD_REQUEST,
                json.global[0]
              )
            } else if (
              json.error &&
              json.error.global &&
              json.error.global.length > 0
            ) {
              responseHandler.returnError(
                httpStatus.BAD_REQUEST,
                json.error.global[0]
              )
            }
          }
          lichessUrl = `https://lichess.org/swiss/${json.id}`
        } catch (e) {
          console.log('Lichess tournament creation failed', e)
          message = 'Tournament creation failed! Please Try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        // Set up defaults for tournament row in the DB
        tournamentBody.federation = 'Online Lichess'
        tournamentBody.director = tournamentBody.organizer
        tournamentBody.time_control = `${tournamentBody.initial_time}+${tournamentBody.increment_time}`
        tournamentBody.start_date = tournamentBody.startDate
        tournamentBody.end_date = tournamentBody.startDate
        tournamentBody.tournament_type = 'Swiss'
        tournamentBody.address = lichessUrl || 'Online Lichess'
        tournamentBody.state = 'Online Lichess'
        tournamentBody.country = 'Online Lichess'
        tournamentBody.federation = 'Online Lichess'
        tournamentBody.address = lichessUrl

        const data = await this.tournamentDao.create(tournamentBody)
        return responseHandler.returnSuccess(httpStatus.CREATED, message, {
          lichess_tournament_url: lichessUrl,
          tournament_id: data.id,
        })
      } catch (e) {
        logger.error(e)
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Something went wrong!'
        )
      }
    } catch (e) {
      console.log('Error creating lichess tournament ..')
      console.log(e)
    }
  }

  createLichessArenaTournament = async (tournamentBody, req) => {
    try {
      // Creating lichess arena tournament
      // Arena payload looks as below:
      /*
      {
        arbiter: "M Venkatesan"
         description: "Test Description"
         duration: 7
        entry_fee: 500
        increment_time: "5"
         initial_time: "10"
        name: "ACC National Open Blitz Tournament"
         organizer: "Alekhines Chess Club"
         rated: true
         startDate: Object { "$L": "en", "$y": 2023, "$M": 7, … }
         startTime: undefined
      }
      */

      try {
        let message = 'Successfully created tournament.'
        if (req.user.role !== userRoles.ORGANIZER) {
          message =
            'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        tournamentBody.created_by = req.user.id
        tournamentBody.is_active = true

        const lichessRequestBody = {
          name: tournamentBody.name,
          clockTime: tournamentBody.initial_time,
          clockIncrement: tournamentBody.increment_time,
          minutes: tournamentBody.duration,
          startDate: tournamentBody.startDate,
          variant: 'standard',
          rated: tournamentBody.rated,
          berserkable: false, // Should this be true
          streakable: false, // Should this be true
          hasChat: true,
          description: tournamentBody.description,
          // password: Should we have the tournament password here?
        }

        const name_len = tournamentBody.name?.length

        if (name_len && name_len > 30) {
          console.log('Cannot exceed 30 characters')
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name cannot exceed 30 characters'
          )
        }

        // validate lichess restrictions
        const tournamentOKRatio =
          (lichessRequestBody.minutes * 60) /
          (96 * lichessRequestBody.clockTime +
            48 * lichessRequestBody.clockIncrement +
            15)
        console.log(
          'Cannot violate tournament timing ratio ',
          tournamentOKRatio
        )

        if (tournamentOKRatio < 3 || tournamentOKRatio > 150) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Lichess tournament time ratio check failed'
          )
        }

        // Options to be given as parameter
        // in fetch for making requests
        // other then GET
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // The authorization token has to be picked from the DB
            Authorization: 'Bearer lio_oTnnA1AE1Kd9xkS3aEwqoG10b2Podg58',
            Accept: 'application/json',
          },
          body: new URLSearchParams(lichessRequestBody),
        }

        let lichessResponse = ''
        let lichessUrl = ''
        try {
          lichessResponse = await fetch(
            'https://lichess.org/api/tournament',
            options
          )

          const json = await lichessResponse.json()

          if (!json.id) {
            if (json.global && json.global.length > 0) {
              responseHandler.returnError(
                httpStatus.BAD_REQUEST,
                json.global[0]
              )
            } else if (
              json.error &&
              json.error.global &&
              json.error.global.length > 0
            ) {
              responseHandler.returnError(
                httpStatus.BAD_REQUEST,
                json.error.global[0]
              )
            }
          }

          // Set up defaults for tournament row in the DB
          tournamentBody.federation = 'Online Lichess'
          tournamentBody.director = tournamentBody.organizer
          tournamentBody.time_control = `${lichessRequestBody.clockTime}+${lichessRequestBody.clockIncrement}`
          tournamentBody.start_date = lichessRequestBody.startDate
          tournamentBody.end_date = lichessRequestBody.startDate
          tournamentBody.tournament_type = 'Arena'
          lichessUrl = `https://lichess.org/tournament/${json.id}`
          tournamentBody.address = lichessUrl
          tournamentBody.state = 'Online Lichess'
          tournamentBody.country = 'Online Lichess'
        } catch (e) {
          console.log('Lichess tournament creation failed', e)
          message = 'Tournament creation failed! Please Try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        const data = await this.tournamentDao.create(tournamentBody)
        return responseHandler.returnSuccess(httpStatus.CREATED, message, {
          lichess_tournament_url: lichessUrl,
          tournament_id: data.id,
        })
      } catch (e) {
        logger.error(e)
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Something went wrong!'
        )
      }
    } catch (e) {
      console.log('Error creating lichess tournament ..')
      console.log(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  createLichessTournament = async (tournamentBody, req) => {
    const { tournament_type } = tournamentBody
    if (tournament_type === 'Swiss') {
      return this.createLichessSwissTournament(tournamentBody, req)
    }
    return this.createLichessArenaTournament(tournamentBody, req)
  }

  /**
   * Create a tournament
   * @param {Object} tournamentBody
   * @returns {Object}
   */
  createTournament = async (tournamentBody, req) => {
    try {
      let message = 'Successfully created tournament.'
      if (
        req.user.role !== userRoles.ORGANIZER &&
        req.user.role !== userRoles.ADMIN
      ) {
        message =
          'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      if (tournamentBody?.feedback?.length && tournamentBody?.id) {
        message = 'Successfully created tournament feedback.'
        const key = uuidv4()
        const data = tournamentBody.feedback.map((f, i) => {
          return {
            question_text: f.question_text,
            question_type: f.question_type,
            rank: i + 1,
            field_to_update: f.field,
            tournament_key: key,
            flow_id: 2,
            is_mandatory: f.is_mandatory,
            validator_regex: f.validator_regex,
            pincode_regex: f.pincode_regex,
          }
        })
        const res = this.ccTournamentFeedbackDao.bulkCreate(data)
        if (!res) {
          message = 'Tournament feedback creation failed! Please Try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        this.tournamentDao.updateById({ feedback_key: key }, tournamentBody?.id)
        return responseHandler.returnSuccess(httpStatus.CREATED, message, data)
      }
      if (req?.files?.length) {
        req.files.forEach((f) => {
          if (f.path.includes('brochure')) {
            tournamentBody.brochure = f.path
          }
          if (f.path.includes('image')) {
            tournamentBody.display_pic = f.path
          }
        })
      }

      tournamentBody.created_by = req.user.id
      tournamentBody.is_active = true

      const data = await this.tournamentDao.create(tournamentBody)

      if (!data) {
        message = 'Tournament creation failed! Please Try again.'
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
   * Get Tournament List
   * @returns {Object}
   */
  getTournaments = async (limit = 10, offset = 0) => {
    try {
      const message = 'Fetched tournaments successfully.'
      const data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          cct_id: {
            [Op.ne]: null,
          },
        },
        undefined,
        [
          literal(
            `CASE WHEN "start_date" >= CURRENT_DATE THEN "start_date" ELSE NULL END ASC,CASE WHEN "start_date" < CURRENT_DATE THEN "start_date" ELSE NULL END DESC`
          ),
        ],
        limit,
        offset
      )
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
   * Get Tournament List
   * @param {Number} id
   * @returns {Object}
   */
  getTournamentById = async (id) => {
    try {
      let message = 'Fetched tournament details successfully.'
      const data = await this.tournamentDao.findOneWithUser(id, [
        'id',
        'email',
        'phone_number',
      ])

      if (!data) {
        message = "Tournament doesn't exists!"
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (data.feedback_key) {
        const feedbacks = await this.ccTournamentFeedbackDao.findByWhere({
          tournament_key: data.feedback_key,
        })
        data.setDataValue('feedbacks', feedbacks)
      }
      const roundDetails = await this.tournamentPairingsDao.findDistinct(
        'round',
        { tournament_id: id }
      )
      const scored = await this.tournamentPairingsDao.findSumByGroup(
        'round',
        'result',
        {
          tournament_id: id,
          result: { [Op.gt]: 0 },
        }
      )
      const playerCountMap = await this.tournamentPairingsDao.findCountByGroup(
        'round',
        'result',
        {
          tournament_id: id,
        }
      )
      const isScored = await this.tournamentPairingsDao.findCountByGroup(
        'round',
        'is_scored',
        {
          tournament_id: id,
          is_scored: true,
        }
      )

      // const maxScore = playerCount ? Math.round(playerCount / 2) : playerCount

      let currentRound = data.current_round || 0
      if (!data.current_round) {
        currentRound =
          roundDetails
            .map((r) => {
              return r.round
            })
            .sort()
            .pop() || 0

        if (
          scored.some((s) => {
            return s.round === currentRound
          })
        ) {
          currentRound += 1
        }
      }

      const pairings = [...Array(data.rounds).keys()].reduce((acc, curr) => {
        acc[curr + 1] = {
          paired: roundDetails
            .map((r) => {
              return r.round
            })
            .includes(curr + 1),
          scored:
            Number(
              playerCountMap?.find((s) => {
                return s.round === curr + 1
              })?.count
            ) ===
            Number(
              isScored?.find((s) => {
                return s.round === curr + 1
              })?.count
            ),
        }
        return acc
      }, {})

      if (data.cct_id) {
        const ccTournament = await sequelize.query(
          `select tournament_key from cc_tournaments where id=${data.cct_id};`,
          {
            type: sequelize.QueryTypes.SELECT,
          }
        )
        if (ccTournament.length > 0) {
          data.setDataValue('tournamentKey', ccTournament[0].tournament_key)
        }
      }
      data.setDataValue('pairings', pairings)
      data.setDataValue('currentRound', currentRound)

      // await fetchLatestFidePlayers()

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
   * Get Tournament List created by Organizer
   * @returns {Object}
   */
  getTournamentsByUser = async (user, query) => {
    try {
      const { limit = 8, offset = 0, start_date, end_date, type, ids } = query
      const message = 'Fetched tournaments successfully.'
      const where = {}
      if (user.role !== userRoles.ADMIN) {
        where.created_by = user.id
      }
      if (ids) {
        where.id = ids.split(',')
      }
      if (start_date) {
        where.start_date = { [Op.gte]: moment(start_date) }
      }
      if (end_date) {
        where.end_date = { [Op.lte]: moment(end_date).add(1, 'd') }
      }
      if (type && type !== 'all') {
        where.tournament_type = type === 'offline' ? 'OTB' : { [Op.ne]: 'OTB' }
      }

      const data = await this.tournamentDao.getDataTableData(
        where,
        limit,
        offset,
        ['end_date', 'desc']
      )
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  static getNumberWithOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  /**
   * Create Tournament Pairing
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  createTournamentPairing = async (round, tournamentId) => {
    try {
      let message = `Paired successfully for the ${TournamentService.getNumberWithOrdinal(
        round
      )} round of the tournament.`

      const tournament = await this.tournamentDao.findById(tournamentId)

      if (round > tournament.rounds) {
        message = 'Pairing already done for all rounds in the tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (!tournament.player_fide_ids) {
        message =
          'The pairing process cannot be initiated as there are no players available for matching. Please upload player information first.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const pairingData = await this.tournamentPairingsDao.getCountByWhere({
        round,
        tournament_id: tournamentId,
      })

      if (pairingData > 0) {
        message = `The pairing of players already done for the ${TournamentService.getNumberWithOrdinal(
          round
        )} round.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let data = []
      const fide_ids = tournament.player_fide_ids.split(',')
      let withDrawnIds = []
      if (tournament.withdrawn_uuid) {
        withDrawnIds = tournament.withdrawn_uuid.split(',')
      }
      let players = await this.playersDao.findByWhere({
        uuid: fide_ids.concat(withDrawnIds),
        is_active: true,
      })
      players = players.map((p) => {
        return {
          ...p,
          is_withdrawn: withDrawnIds.includes(p.uuid),
        }
      })
      let white = []
      let black = []
      let ranking = {}

      if (round > 1) {
        const pairing = await this.tournamentPairingsDao.findByWhere({
          round: { [Op.lt]: round },
          tournament_id: tournamentId,
        })

        const playersRanking = getTieBreaks(pairing, round - 1)

        ranking = playersRanking.reduce((a, b, i) => {
          a[b.player_uuid] = i + 1
          return a
        }, {})

        if (!pairing.length) {
          message = `The pairing of players for the ${TournamentService.getNumberWithOrdinal(
            round - 1
          )} round is not done yet. Please generate paring of it.`
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        // players = players.concat(newPlayers)
        white = pairing
          .filter((p) => {
            return !p.parent_id
          })
          .map((e) => {
            return {
              ...e,
              player_score: Number(e.player_score) + Number(e.result),
            }
          })
        black = pairing
          .filter((p) => {
            return p.parent_id
          })
          .map((e) => {
            return {
              ...e,
              player_score: Number(e.player_score) + Number(e.result),
            }
          })
      }
      //   const { whitePlayers, blackPlayers } = swissOtherRoundPairings(
      //     players.concat(newPlayers),
      //     opponents,
      //     round,
      //     tournamentId
      //   )

      const { whitePlayers, blackPlayers } = await javaFoRoundPairing(
        players,
        round,
        tournament,
        white,
        black,
        ranking
      )

      const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
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
      const oppRes = await this.tournamentPairingsDao.bulkCreate(newOpponents)

      await this.tournamentDao.updateById(
        { current_round: Number(round) },
        tournamentId
      )

      data = res.map((w, i) => {
        return {
          player: w,
          opponent: oppRes[i] || null,
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

  revertTournamentPairing = async (tournamentId) => {
    try {
      const message = 'Successfully reverted current round pairing'
      const tournament = await this.tournamentDao.findById(tournamentId)

      await this.tournamentPairingsDao.deleteByWhere({
        round: tournament.current_round,
      })
      await this.tournamentDao.updateById(
        { current_round: tournament.current_round - 1 },
        tournamentId
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
   * Upload Tournament Pairing
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  // uploadTournamentPairing = async (round, tournamentId) => {
  //   try {
  //     let message = `Paired players uplaoded successfully for the ${TournamentService.getNumberWithOrdinal(
  //       round
  //     )} round of the tournament.`

  //     const deleteRes = await this.tournamentPairingsDao.deleteByWhere({
  //       round,
  //       tournament_id: tournamentId,
  //       player_score: { [Op.eq]: 0 },
  //     })

  //     if (!deleteRes) {
  //       message = `Pairing for ${TournamentService.getNumberWithOrdinal(
  //         round
  //       )} round cannot be done again since it is ended.`
  //       return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
  //     }

  //     const filePath = req.file.path
  //     const type = req.file.mimetype

  //     const data = await parseFile(filePath, type)

  //     if (!data) {
  //       message =
  //         'Failed to parse data from file! Please upload again with correct format.'
  //       return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
  //     }

  //     const whitePlayers = []
  //     const blackPlayers = []
  //     const result = []

  //     const pairedData = await this.tournamentPairingsDao.findByWhere({
  //       round,
  //       tournament_id: tournamentId,
  //     })

  //     data.forEach((player) => {
  //       const playerData = {
  //         round,
  //         tournament_id,
  //         player_fide_id: player?.player_fide_id || '',
  //         player_name: player.player_name,
  //         player_rating: player?.player_rating || 0,
  //         player_score:
  //           pairedData.find((p) => {
  //             return (
  //               p.player_name.toLoweCase() === player.player_name.toLoweCase()
  //             )
  //           })?.player_score || 0,
  //       }
  //       const opponentData = {
  //         round,
  //         tournament_id,
  //         player_fide_id: player?.opponent_fide_id || '',
  //         player_name: player.opponent_name,
  //         player_rating: player?.opponent_rating || 0,
  //         player_score:
  //           pairedData.find((p) => {
  //             return (
  //               p.player_name.toLoweCase() === player.player_name.toLoweCase()
  //             )
  //           })?.player_score || 0,
  //       }
  //       whitePlayers.push(playerData)
  //       blackPlayers.push(opponentData)
  //       result.push({ player: playerData, opponent: opponentData })
  //     })

  //     const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
  //     if (!res) {
  //       message = 'Failed to pair players! Please try again.'
  //       return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
  //     }
  //     const opponents = blackPlayers.map((b, i) => {
  //       return {
  //         ...b,
  //         parent_id: res[i].id,
  //       }
  //     })
  //     await this.tournamentPairingsDao.bulkCreate(opponents)

  //     return responseHandler.returnSuccess(httpStatus.OK, message, result)
  //   } catch (e) {
  //     logger.error(e)
  //     return responseHandler.returnError(
  //       httpStatus.BAD_REQUEST,
  //       'Something went wrong!'
  //     )
  //   }
  // }

  /**
   * Get Tournament Pairing for particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPairings = async (round, tournamentId) => {
    try {
      let message = 'Fetched tournament player pairings successfully.'
      const data = await this.tournamentPairingsDao.findByWhere({
        round,
        tournament_id: tournamentId,
      })
      if (!data.length) {
        message = `Pairing of Round ${round} is not done yet! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const players = data
        .filter((p) => {
          return !p.parent_id
        })
        .map((e) => {
          return {
            player: e,
            opponent: data.find((d) => {
              return d.parent_id === e.id
            }),
          }
        })
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
   * Get Tournament Players Ranking after particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPlayersRanking = async (round, tournamentId) => {
    try {
      let message = `Fetched players ranking after round ${round} successfully.`
      const exists = await this.tournamentPairingsDao.checkExist({
        round,
        tournament_id: tournamentId,
      })

      if (!exists) {
        message = `Round ${
          round - 1
        } is still going on! Please try after round ${round - 1} is ended.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const data = await this.tournamentPairingsDao.findByWhere({
        round: { [Op.lte]: round },
        tournament_id: tournamentId,
      })
      if (!data.length) {
        message = `No players found for Round ${round}! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const players = getTieBreaks(data, round)

      return responseHandler.returnSuccess(httpStatus.OK, message, players)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  updateScoring = async (round, tournamentId, scores) => {
    try {
      let message = `Updated scores of matches for Round ${round} successfully.`
      const tournament = await this.tournamentDao.findById(tournamentId)

      if (tournament.current_round > round) {
        message = `Scores of round ${round} can't be updated since it is already completed!`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const promises = scores.map((s) => {
        return this.tournamentPairingsDao.updateById(
          { result: s.score, is_scored: true },
          s.id
        )
      })
      const result = await Promise.allSettled(promises)
      if (!result.length) {
        message = `Updating scores of Round ${round} is failed! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (tournament.rounds === Number(round)) {
        const pendingScoreToUpload =
          await this.tournamentPairingsDao.checkExist({
            round,
            tournament_id: tournamentId,
            is_scored: false,
          })
        if (pendingScoreToUpload) {
          const data = await this.tournamentPairingsDao.findWithPlayers({
            round: { [Op.lte]: round },
            tournament_id: tournamentId,
          })
          if (!data.length) {
            message = `No players found for Round ${round}! Please try again.`
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
          const players = getTieBreaks(data, Number(round))
          const tournamentPrizeCategoryMappings =
            await this.tournamentPrizeMappingDao.findAllWithCategory({
              tournament_id: tournamentId,
            })

          let winningPlayers = []

          tournamentPrizeCategoryMappings.forEach((prize) => {
            if (prize.category_id) {
              const operator = prize['prize_category.operator']
              const value = prize['prize_category.value']
              const filteredPlayers = players.filter((p) => {
                return (
                  TournamentService.getFilterBasedOnOperator(
                    operator,
                    p,
                    `player.${prize['prize_category.type']}`,
                    value
                  ) && p['player.gender'] === prize['prize_category.gender']
                )
              })
              const finalPlayers = filteredPlayers.splice(
                0,
                prize.prizes.length
              )

              winningPlayers = winningPlayers.concat(
                finalPlayers.map((p, i) => {
                  return {
                    tournament_id: tournamentId,
                    name: p['player.name'],
                    mobile_number: p['player.mobile'],
                    upi_id: p['player.upi_id'],
                    amount: prize.prizes[i].amount,
                    prize_name:
                      prize.prizes.length > 1
                        ? `${prize.name} - ${prize.prizes[i].title}`
                        : prize.name,
                  }
                })
              )
            } else {
              const finalPlayers = [...players].splice(0, prize.prizes.length)

              winningPlayers = winningPlayers.concat(
                finalPlayers.map((p, i) => {
                  return {
                    tournament_id: tournamentId,
                    name: p['player.name'],
                    mobile_number: p['player.mobile'],
                    upi_id: p['player.upi_id'],
                    amount: prize.prizes[i].amount,
                    prize_name:
                      prize.prizes.length > 1
                        ? `${prize.name} - ${prize.prizes[i].title}`
                        : prize.name,
                  }
                })
              )
            }
          })

          winningPlayers = winningPlayers
            .reduce((a, b) => {
              const matchedItem = a.find((x) => {
                return x?.name?.trim() === b?.name?.trim()
              })
              if (matchedItem) {
                if (Number(b?.amount) > Number(matchedItem.amount)) {
                  const index = a.indexOf(matchedItem)
                  a[index] = b
                }
              } else {
                a.push(b)
              }
              return a
            }, [])
            .sort((a, b) => {
              return Number(b?.amount) - Number(a?.amount)
            })

          await this.playersPrizePayoutDao.bulkCreate(winningPlayers)
        }
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

  static getFilterBasedOnOperator = (key, player, type, value) => {
    switch (key) {
      case -1:
        return player[type] < value
      case 1:
        return player[type] > value
      default:
        return player[type] === value
    }
  }

  /**
   * @param id: Tournament ID
   * @returns Returns all static prize categories with their prize recommendations.
   * These are merged with any prize categories already allocated to the tournament.
   */
  getStaticPrizeCategories = async (id) => {
    try {
      const message = 'Successfully retrieve all prize categories'
      const prizeCats = await this.prizeCategoryDao.findAllRaw({})
      const tournamentPrizeCategoryMappings =
        await this.tournamentPrizeMappingDao.findAllRaw({ tournament_id: id })

      const data = {
        categories: prizeCats,
        prizes: tournamentPrizeCategoryMappings,
      }

      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (error) {
      const message = 'Could not retrieve prize categories'
      logger.error(error)
      return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
    }
  }

  updatePrizingCategories = async (id, payload) => {
    try {
      let message = 'Successfully updated prizes for tournament.'
      await this.tournamentPrizeMappingDao.deleteByWhere({
        tournament_id: id,
      })
      const data = await this.tournamentPrizeMappingDao.bulkCreate(payload)
      if (!data) {
        message = 'Tournament prizes update failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.CREATED, message, data)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  // updatePrizingCategories = async (prizeStructure, req) => {
  //   try {
  //     let success_msg = 'Prize structure creation successful'
  //     let error_msg = 'Tournament Prize Category updation failed ..'
  //     const { tournament_id, categories } = prizeStructure

  //     let obj = {
  //       tournament_id,
  //     }

  //     // Let us clean up current prize categories first
  //     try {
  //       await this.tournamentPrizeMappingDao.deleteByWhere({ tournament_id })
  //     } catch (error) {
  //       console.log('Unable to delete current prize categories', error)
  //       message =
  //         'Prize Category creation failed! Current category clean up failed. Please Try again.'
  //       return responseHandler.returnError(httpStatus.BAD_REQUEST, error_msg)
  //     }

  //     delete prizeStructure['tournament_id']

  //     let catMap = new Map()

  //     for (let key in prizeStructure) {
  //       if (key.startsWith('id_')) continue
  //       let keys = key.split('_')
  //       let prizeCatId = keys[2]

  //       let inputs = []
  //       if (!catMap.get(prizeCatId)) {
  //         catMap.set(prizeCatId, inputs)
  //       } else {
  //         inputs = catMap.get(prizeCatId)
  //       }

  //       inputs.push(key)
  //     }

  //     catMap.forEach(async (values, catId) => {
  //       for (let index in values) {
  //         let key = values[index]
  //         let keys = key.split('_')
  //         let prizeCatId = keys[2]
  //         let prizeIndex = keys[3]

  //         obj = {
  //           ...obj,
  //           category_id: parseInt(catId),
  //         }

  //         switch (prizeIndex) {
  //           case '1':
  //             obj.prize1 = parseInt(prizeStructure[key])
  //             break
  //           case '2':
  //             obj.prize2 = parseInt(prizeStructure[key])
  //             break
  //           case '3':
  //             obj.prize3 = parseInt(prizeStructure[key])
  //             break
  //         }
  //       }

  //       try {
  //         await this.tournamentPrizeMappingDao.create(obj)
  //       } catch (e) {
  //         console.log('Failed to insert into DB ', e)
  //         return responseHandler.returnError(httpStatus.BAD_REQUEST, error_msg)
  //       }
  //     })

  //     return responseHandler.returnSuccess(httpStatus.CREATED, success_msg, {})
  //   } catch (error) {
  //     console.log(error)
  //     message = 'Prize Category creation failed! Please Try again.'
  //     return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
  //   }
  // }

  createPrizingCategories = async (payload) => {
    try {
      let message = 'Successfully created prize categories.'
      const data = await this.prizeCategoryDao.bulkCreate(payload)
      if (!data) {
        message = 'Prize Categories creation failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.CREATED, message, data)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  getStatistics = async (userId) => {
    try {
      const message = 'Successfully fetched statistical data.'
      const tournaments = await this.tournamentDao.findByWhere({
        created_by: userId,
      })

      const allPlayers = tournaments
        .map((b) => {
          return b?.player_fide_ids?.split(',') || []
        })
        .flat()
      const uniquePlayers = [...new Set(allPlayers)]
      const players = await this.playersDao.findByWhere({ uuid: uniquePlayers })

      const yesterdayPlayers = players.filter((p) => {
        return moment().diff(p.createdAt, 'd') === 1
      })?.length

      const todayPlayers = players.filter((p) => {
        return moment(p.createdAt).diff(moment(), 'd') === 0
      })?.length

      const revenue = tournaments.reduce((t, ta) => {
        const total = players.reduce((a, b) => {
          if (ta?.player_fide_ids?.includes(b.uuid)) {
            a += Number(
              ta.entry_fee.find((e) => {
                return e.category === b.entry_fee_category
              })?.fee || 0
            )
          }
          return a
        }, 0)

        t += total
        return t
      }, 0)

      const activeTournaments = tournaments.filter((t) => {
        return moment(t.end_date).diff(moment(), 'm') > 0
      }).length

      const tournamentDistribution = tournaments.reduce((a, b) => {
        const type = b.tournament_type === 'OTB' ? 'Offline' : 'Online'
        if (!a[type]) {
          a[type] = 1
        } else {
          a[type] += 1
        }
        return a
      }, {})

      const distributionChart = Object.keys(tournamentDistribution).map(
        (td) => {
          return {
            type: td,
            value: tournamentDistribution[td],
          }
        }
      )

      const playersIncreament =
        (todayPlayers - yesterdayPlayers) / (yesterdayPlayers || 1)

      const data = {
        totalTournaments: tournaments.length,
        totalPlayers: players.length,
        totalRevenue: revenue,
        activeTournaments,
        distributionChart,
        todayPlayers,
        playersIncreament,
      }
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  uploadWinners = async (req) => {
    try {
      let message = 'Successfully uploaded players.'
      const filePath = req.file.path
      const type = req.file.mimetype

      let data = await parseFile(filePath, type)

      data = data.map((d) => {
        return { ...d, created_by: req.user.role }
      })

      if (!data) {
        message =
          'Failed to parse data from file! Please upload again with correct format.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const { tournamentId } = req.body
      const tournament = await this.tournamentDao.findById(tournamentId)

      let fide_ids = []
      if (tournament.player_fide_ids) {
        fide_ids = tournament.player_fide_ids.split(',').map((f) => {
          return Number(f)
        })
        data = data.filter((ele) => {
          return !fide_ids.includes(Number(ele.fide_id))
        })
      }

      if (!data.length) {
        message = 'Players are already registered in this tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let players = await this.playersDao.findByWhere(
        {
          fide_id: data.map((d) => {
            return d.fide_id
          }),
        },
        ['fide_id']
      )

      players = players.map((p) => {
        return p?.fide_id
      })

      if (players.length > 0) {
        data = data.filter((ele) => {
          return !players.includes(Number(ele.fide_id))
        })
      }

      const result = await this.playersDao.bulkCreate(data)

      if (!result) {
        message = 'Failed to upload players! Please try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const ids = [
        ...new Set(fide_ids),
        ...new Set(players),
        ...new Set(
          data.map((r) => {
            return Number(r.fide_id)
          })
        ),
      ]

      await this.tournamentDao.updateWhere(
        {
          player_fide_ids: ids.join(),
        },
        { id: tournamentId }
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
   * Update tournament
   * @param {Number} id
   * @param {Object} tournamentBody
   * @returns {Object}
   */
  updateTournamentById = async (id, tournamentBody, req) => {
    try {
      let message = 'Successfully updated tournament.'
      const tournament = await this.tournamentDao.findById(id)
      if (
        tournament.created_by !== req.user.id &&
        req.user.role !== userRoles.ADMIN
      ) {
        message = `Tournament belongs to different organizer. Please login as same organizer to update.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (tournamentBody.entry_fee) {
        tournamentBody.entry_fee = JSON.parse(tournamentBody.entry_fee)
      }

      if (tournamentBody.is_brochure) {
        tournamentBody = JSON.parse(JSON.stringify(tournamentBody))

        if (tournamentBody.logos) {
          tournamentBody.logos = JSON.parse(tournamentBody.logos)
        }
      }

      if (tournamentBody.feedbacks) {
        const feedbacks = JSON.parse(tournamentBody.feedbacks)
        const currentFeedbacks = await this.ccTournamentFeedbackDao.findByWhere(
          { tournament_key: tournament.feedback_key },
          ['question_text', 'id']
        )
        const remove = currentFeedbacks
          .filter((cf) => {
            return !feedbacks.some((f) => {
              return f.question_text === cf.question_text
            })
          })
          .map((cf) => {
            return this.ccTournamentFeedbackDao.deleteByWhere({ id: cf.id })
          })
        const existing = []
        const newData = []
        feedbacks.forEach((f, i) => {
          if (
            currentFeedbacks
              .map((cf) => {
                return cf.question_text
              })
              .includes(f.question_text)
          ) {
            existing.push(
              this.ccTournamentFeedbackDao.updateById(
                { rank: i + 1, is_mandatory: f.is_mandatory },
                f.id
              )
            )
          } else {
            newData.push({
              question_text: f.question_text,
              question_type: f.question_type,
              rank: i + 1,
              field_to_update: f.field,
              tournament_key: tournament.feedback_key,
              flow_id: 2,
              is_mandatory: f.is_mandatory,
              validator_regex: f.validator_regex,
              pincode_regex: f.pincode_regex,
            })
          }
        })
        if (newData.length) {
          await this.ccTournamentFeedbackDao.bulkCreate(newData)
        }
        if (existing.length) {
          await Promise.allSettled(existing)
        }
        if (remove.length) {
          await Promise.allSettled(remove)
        }
      }

      if (req?.files?.length) {
        const promises = req.files.map(async (f) => {
          if (f.path.includes('brochure')) {
            tournamentBody.brochure = f.path
          }
          if (f.path.includes('image')) {
            if (tournamentBody.is_brochure) {
              const image = sharp(f.path)
              const meta = await image.metadata()
              const { format } = meta

              const configure = {
                jpeg: { quality: 50 },
                webp: { quality: 50 },
                png: { compressionLevel: 5 },
              }

              // const extn = f.filename.slice(f.filename.lastIndexOf('.'))

              const newPath = f.path.replace(
                `.${format}`,
                `-compressed.${format}`
              )

              await image[format](configure[format]).toFile(
                newPath,
                (err, info) => {
                  console.log('err', err, info)
                }
              )
              if (tournamentBody.logos) {
                const index = tournamentBody.logos.findIndex((l) => {
                  return l === f.originalname
                })
                tournamentBody.logos[index] = newPath
              } else if (
                Object.values(tournamentBody).includes(f.originalname)
              ) {
                const index = Object.values(tournamentBody).findIndex((l) => {
                  return l === f.originalname
                })
                const key = Object.keys(tournamentBody)[index]
                tournamentBody[key] = newPath
              }
            } else {
              tournamentBody.display_pic = f.path
            }
          }
        })
        await Promise.allSettled(promises)
      }

      let body = tournamentBody
      if (tournamentBody.enable_registration) {
        body.enable_registration = body.enable_registration === 'true'
      }
      if (tournamentBody.is_brochure) {
        const templateId = tournamentBody.template
        const brochure = tournamentBody?.brochure
        delete tournamentBody.is_brochure
        delete tournamentBody.template
        delete tournamentBody?.brochure
        const data = {
          brochure_details: {
            ...tournament.brochure_details,
            [templateId]: tournamentBody,
          },
        }
        body = data
        if (brochure) {
          body.brochure = brochure
        }
      }

      const data = await this.tournamentDao.updateById(body, id)

      if (tournamentBody.enable_registration || tournament.cct_id) {
        if (tournamentBody.enable_registration) {
          if (body.enable_registration) {
            message = 'Tournament registration has been enabled successfully.'
          } else {
            message = 'Tournament registration has been disabled successfully'
          }
        }
        try {
          const options = {
            method: 'POST',
            body: JSON.stringify({ tournament_id: id }),
          }
          const res = await fetch(
            `${config.circlechess.endpoint}/tournaments/save_chessmaster_tournament`,
            options
          )
          const response = await res.json()
          if (!response.status) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          if (!tournament.cct_id) {
            await this.tournamentDao.updateById(
              { cct_id: response.id, feedback_key: response.tournament_key },
              id
            )
          }
        } catch (error) {
          logger.error(error)
          message = 'Failed to publish tournament.Please try again'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
      }

      if (!data) {
        message = 'Tournament updation failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.OK, message, body)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }
}

module.exports = TournamentService
