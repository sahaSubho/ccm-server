/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const httpStatus = require('http-status')
const bcrypt = require('bcryptjs')
const path = require('path')
const { Op, literal } = require('sequelize')
const { v4: uuidv4 } = require('uuid')
const moment = require('moment')
const sharp = require('sharp')
const fetch = require('node-fetch')
const TournamentDao = require('../dao/TournamentDao')
const TournamentConfigurationDao = require('../dao/TournamentConfigurationDao')
const CCTournamentFeedbackDao = require('../dao/CcTournamentFeedback')
const PlayersDao = require('../dao/PlayersDao')
const TournamentPlayersDao = require('../dao/TournamentPlayersDao')
const TournamentPairingsDao = require('../dao/TournamentPairingDao')
const PlayerStartingRankDao = require('../dao/PlayerStartingRankDao')
const TournamentStandingsDao = require('../dao/TournamentStandingsDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const { sequelize } = require('../models')
const { userRoles } = require('../config/constant')
const {
  javaFoRoundPairing,
  sortByInitialRankings,
} = require('../helper/pairingEngine/swiss')
const getTieBreaks = require('../helper/tieBreakers')
const UserService = require('./UserService')
const PrizeCategoryDao = require('../dao/PrizeCategoryDao')
const TeamsDao = require('../dao/TeamsDao')
const TeamPairingsDao = require('../dao/TeamPairingsDao')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const CCUserDao = require('../dao/CCUserDao')
const TournamentPrizeCategoryMappingDao = require('../dao/TournamentCategoryMappingDao')
const parseFile = require('../helper/parseFile')
const RedisService = require('./RedisService')
const {
  convertPlayersResultInNumeric,
  processResult,
} = require('../helper/tieBreakers/utils')

const s3Helper = require('../helper/s3Helper')
// const fetchLatestFidePlayers = require('../helper/fidePlayers')

const fieldsOfType1 = ['address', 'email', 'upi_id']

class TournamentService {
  constructor() {
    this.tournamentDao = new TournamentDao()
    this.prizeCategoryDao = new PrizeCategoryDao()
    this.tournamentPrizeMappingDao = new TournamentPrizeCategoryMappingDao()
    this.playersDao = new PlayersDao()
    this.trnplayersDao = new TournamentPlayersDao()
    this.tournamentPairingsDao = new TournamentPairingsDao()
    this.ccTournamentFeedbackDao = new CCTournamentFeedbackDao()
    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
    this.userService = new UserService() // This is specifically to for querying the lichess token information from DB
    this.redisService = new RedisService()
    this.teamsDao = new TeamsDao()
    this.teamPairingsDao = new TeamPairingsDao()
    this.tournamentConfigurationDao = new TournamentConfigurationDao()
    this.CCUserDao = new CCUserDao()
    this.playerStartingRankDao = new PlayerStartingRankDao()
    this.tournamentStandingsDao = new TournamentStandingsDao()
  }

  static convertToTeamPairings = (data) => {
    const result = []

    const teams = data.reduce((acc, match) => {
      if (!acc[match.teamA]) {
        acc[match.teamA] = []
      }
      if (!acc[match.teamB]) {
        acc[match.teamB] = []
      }
      acc[match.teamA].push(match.player)
      acc[match.teamB].push(match.opponent)
      return acc
    }, {})

    for (let index = 0; index < Object.keys(teams).length; index += 2) {
      const teamA = Object.keys(teams)[index]
      const teamB = Object.keys(teams)[index + 1]

      result.push({
        teamA,
        teamAPlayers: teams[teamA],
        teamB,
        teamBPlayers: teams[teamB],
      })
    }

    return result
  }

  static classifyTimeControl = (timeControl) => {
    // Handle special cases
    if (/hour|90m|60m|45m/i.test(timeControl)) {
      return 'Classical'
    }
    if (/as per format|n|nj/i.test(timeControl)) {
      return 'Unknown'
    }

    // Extract minutes and seconds from various formats
    let minutes = 0
    let seconds = 0

    // Handle formats like "25+10" assuming x as minutes and y as seconds
    const plusFormatMatch = timeControl.match(/(\d+)\s*\+\s*(\d+)/)
    if (plusFormatMatch) {
      minutes = Number(plusFormatMatch[1])
      seconds = Number(plusFormatMatch[2])
    } else {
      const matches = timeControl.match(/(\d+)(m|s)?/g)
      if (matches) {
        matches.forEach((part) => {
          if (part.includes('m')) {
            minutes = part.replace(/\D/, '')
          } else if (part.includes('s')) {
            seconds = part.replace(/\D/, '')
          } else {
            minutes = part.replace(/\D/, '')
          }
        })
      }
    }

    const totalTime = Number(minutes) + Number(seconds / 60)

    // Classify based on total time
    if (totalTime < 3) {
      return 'Bullet'
    }
    if (totalTime >= 3 && totalTime < 10) {
      return 'Blitz'
    }
    if (totalTime >= 10 && totalTime <= 30) {
      return 'Rapid'
    }
    return 'Classical'
  }

  removePairingsFromRedis = async (tournamentId, round, pairingId) => {
    const hashKey = `ccm_pairings_${tournamentId}_${round}`
    const listKey = `ccm_pairings_order_${tournamentId}_${round}`
    await this.redisService.hDel(hashKey, pairingId)
    await this.redisService.lRem(listKey, 0, pairingId)
  }

  addPairingInRedis = async (round, tournamentId, pairingId, pairingObj) => {
    const hashKey = `ccm_pairings_${tournamentId}_${round}`
    const listKey = `ccm_pairings_order_${tournamentId}_${round}`
    await this.redisService.hSet(hashKey, pairingId, JSON.stringify(pairingObj))
    await this.redisService.rPush(listKey, pairingId)
  }

  updatePairingInRedis = async (tournamentId, round, pairingId, data) => {
    const hashKey = `ccm_pairings_${tournamentId}_${round}`
    const existing = await this.redisService.hGet(hashKey, pairingId)
    if (existing) {
      const parsed = JSON.parse(existing)
      parsed.player = {
        ...parsed.player,
        ...data,
      }
      if (parsed.opponent) {
        parsed.opponent = {
          ...parsed.opponent,
          ...data,
        }
      }
      await this.redisService.hSet(hashKey, pairingId, JSON.stringify(parsed))
      if (data?.result) {
        const ongoingKey = `ccm_pairings_ongoing_${tournamentId}_${round}`
        await this.redisService.lRem(ongoingKey, 1, pairingId)
      }
    }
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
        if (![userRoles.ORGANIZER, userRoles.ADMIN].includes(req.user.role)) {
          message =
            'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        if (tournamentBody.tournament_type === 'Circlechess_Online') {
          // Set additional tournament properties
          tournamentBody.time_control = `${tournamentBody.initial_time}+${tournamentBody.increment_time}`
          tournamentBody.time_format = TournamentService.classifyTimeControl(
            tournamentBody.time_control
          )
          tournamentBody.start_date = tournamentBody.startDate
          tournamentBody.end_date = new Date(
            new Date(tournamentBody.startDate).getTime() + 12 * 60 * 60 * 1000
          ).toISOString()
          tournamentBody.country = 'Online Circlechess'
          tournamentBody.federation = 'IND'
          tournamentBody.is_active = true
          tournamentBody.created_by = req.user.id
          tournamentBody.address = 'Online Circlechess'
          tournamentBody.state = 'Online Circlechess'
          if (tournamentBody?.password?.length > 0) {
            tournamentBody.password = bcrypt.hashSync(
              tournamentBody.password,
              8
            )
          }

          try {
            // Step 1: Create the tournament in the database
            const data = await this.tournamentDao.create(tournamentBody)
            if (data.id) {
              await this.tournamentDao.updateById(
                {
                  address: `https://${
                    process.env.ENV === 'preprod' ? 'pp-' : ''
                  }learn.circlechess.com/playChess?tournamentId=${
                    data.id
                  }&tournamentName=${data.name?.replace(/\s/g, '-')}`,
                },
                data.id
              )
            }
            const defaultConfig = {
              tiebreaks: ['BH-C1', 'BH', 'SB'],
              tiebreak_settings: {
                BH: { games: { best: '1', worst: '0' } },
                SB: { games: { best: '1', worst: '0' } },
                'BH-C1': { games: { best: '1', worst: '0' } },
              },
              sorting: true,
              engine: 'javafo',
            }
            await this.setConfiguration(data.id, defaultConfig)

            // Step 2: Notify the game service with the created tournament data
            const url = `${config.gameService.endpoint}/createTournament`
            const options = {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.XapiKey, // Include any required API key
              },
              body: JSON.stringify({ tournamentData: data }), // Include the tournament data
            }

            const response = await fetch(url, options)
            const jsonResponse = await response.json()
            console.log(response, jsonResponse)

            // Handle game service response
            if (jsonResponse.status === 200) {
              return responseHandler.returnSuccess(
                httpStatus.CREATED,
                'Tournament created and game service notified successfully.',
                { tournament_id: data.id }
              )
            }
            console.error('Game service returned an error:', jsonResponse)
            return responseHandler.returnError(
              httpStatus.INTERNAL_SERVER_ERROR,
              'Tournament created, but failed to notify game service.'
            )
          } catch (error) {
            console.error(
              'Error during tournament creation or notification:',
              error.message
            )
            return responseHandler.returnError(
              httpStatus.INTERNAL_SERVER_ERROR,
              'Failed to create tournament or notify game service.'
            )
          }
        } else {
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
              `https://lichess.org/api/swiss/new/${tournamentBody.teamId}`,
              options
            )
            const json = await lichessResponse.json()
            console.log('lichess swiss', JSON.stringify(json))
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
          tournamentBody.time_format = TournamentService.classifyTimeControl(
            tournamentBody.time_control
          )
          tournamentBody.start_date = tournamentBody.startDate
          tournamentBody.end_date = new Date(
            new Date(tournamentBody.startDate).getTime() + 12 * 60 * 60 * 1000
          ).toISOString()
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
        }
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
        if (![userRoles.ORGANIZER, userRoles.ADMIN].includes(req.user.role)) {
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

        const lichessUser = await this.userService.getLichessUserById(
          req.user.lic_name
        )
        // Options to be given as parameter
        // in fetch for making requests
        // other then GET
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // The authorization token has to be picked from the DB
            Authorization: `Bearer ${lichessUser.lichess_token}`,
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
          tournamentBody.time_format = TournamentService.classifyTimeControl(
            tournamentBody.time_control
          )
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
    if (
      tournament_type === 'Swiss' ||
      tournament_type === 'Circlechess_Online'
    ) {
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
      if (tournamentBody.is_club_membership) {
        message = 'Successfully created your club.'
      }
      if (
        req.user.role !== userRoles.ORGANIZER &&
        req.user.role !== userRoles.ADMIN
      ) {
        message =
          'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const exits = await this.tournamentDao.checkExist({
        name: tournamentBody.name,
      })
      if (exits) {
        message = `${
          tournamentBody.is_club_membership === 1 ? 'Club' : 'Tournament'
        } name already exists! Try Different name.`
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
            field_type: fieldsOfType1.includes(f.field) ? 1 : 2,
            is_mandatory: f.is_mandatory,
            validator_regex: f.validator_regex,
            pincode_regex: f.pincode_regex,
            answer_options: f.answer_options,
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

      tournamentBody.created_by = req.user.id
      tournamentBody.is_active = true

      tournamentBody.time_format = TournamentService.classifyTimeControl(
        tournamentBody.time_control
      )
      const data = await this.tournamentDao.create(tournamentBody)

      if (!data) {
        message = 'Tournament creation failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const tournamentId = data.id
      if (req?.files?.length) {
        const promise = req.files.map(async (f) => {
          const fileExtension = path.extname(f.originalname)
          if (f.path.includes('brochure')) {
            tournamentBody.brochure = await s3Helper.uploadFilesToS3(
              f,
              `brochures/ccm_${tournamentId}${fileExtension}`
            )
          }
          if (f.path.includes('image')) {
            tournamentBody.display_pic = await s3Helper.uploadFilesToS3(
              f,
              `images/ccm_${tournamentId}${fileExtension}`
            )
          }
          return tournamentBody
        })
        await Promise.allSettled(promise)
        await this.tournamentDao.updateById(tournamentBody, tournamentId)
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

  createCategoryTournament = async (tournamentId) => {
    try {
      const tournament = await this.tournamentDao.findById(tournamentId)
      const categories = tournament.category?.split(',')
      if (categories.length <= 1) {
        const message =
          'Tournament distribution is possible only with more than one category.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const splitTournamentExists = await this.tournamentDao.checkExist({
        parent_id: tournamentId,
      })

      if (splitTournamentExists) {
        const message = 'Splitted Tournament already exists.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const promises = categories.map(async (cat) => {
        const category = cat.split('(')?.[0]?.trim()
        let gender = 'B'
        const genderPart = cat.split('(')?.[1]?.trim()
        if (genderPart) {
          if (genderPart.includes('Boys')) {
            gender = 'M'
          } else {
            gender = 'F'
          }
        }
        const categoryDetails = await this.prizeCategoryDao.findOneByWhere({
          name: category,
          gender,
        })
        const tournamentBody = {
          ...tournament,
          id: undefined,
          name: `${tournament.name} - ${cat}`,
          parent_id: tournamentId,
          category_id: categoryDetails.id,
        }
        return this.tournamentDao.create(tournamentBody)
      })
      await Promise.allSettled(promises)
      const message = 'Successfully splitted the tournament based on categories'
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
   * Get Tournament List
   * @returns {Object}
   */
  getTournaments = async (limit = 10, offset = 0, country = 'India') => {
    try {
      const message = 'Fetched tournaments successfully.'
      const data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          country,
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
      const playerCountMap = await this.trnplayersDao.findCountByGroup(
        'tournament_id',
        'id',
        {
          tournament_id: data.map((t) => {
            return t.id
          }),
        }
      )

      const playersCountMap = playerCountMap.reduce((acc, curr) => {
        acc[curr.tournament_id] = curr.count
        return acc
      }, {})

      data.forEach((tournament) => {
        const playerCount = playersCountMap[tournament.id] || 0
        tournament.players_count = playerCount
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

  getPrizeTournaments = async (count) => {
    try {
      const message = 'Fetched tournaments successfully.'
      const data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          enable_registration: true,
          default_category: 'Prize',
          tournament_type: 'Circlechess_Online',
        },
        undefined,
        [
          literal(
            `CASE WHEN "start_date" >= CURRENT_TIMESTAMP THEN "start_date" ELSE NULL END ASC,CASE WHEN "start_date" < CURRENT_TIMESTAMP THEN "start_date" ELSE NULL END DESC`
          ),
        ],
        count
      )
      const trnprizes = await this.tournamentPrizeMappingDao.findAllRaw({
        tournament_id: data.map((t) => {
          return t.id
        }),
      })
      const playersCountMap = await this.trnplayersDao.findCountByGroup(
        'tournament_id',
        'id',
        {
          tournament_id: data.map((t) => {
            return t.id
          }),
          is_withdrawn: false,
        }
      )

      const intentCountMap = await sequelize.query(
        `SELECT
          a.tournament_id,
          COUNT(*) AS user_count
        FROM
          cc_user_tournament_intent AS a
        JOIN
          cc_users AS b ON a.user_key = b.user_key
        WHERE
          a.wants_to_join = TRUE
          AND NOT EXISTS (
            SELECT 1
            FROM ccm_tournament_players AS cp
            WHERE cp.tournament_id = a.tournament_id
              AND cp.cc_userid = b.user_id
          )
        GROUP BY
          a.tournament_id;`,
        {
          type: sequelize.QueryTypes.SELECT,
        }
      )

      data.forEach((tournament) => {
        const playerCount = playersCountMap.find((p) => {
          return p.tournament_id === tournament.id
        })?.count
        tournament.players_joined = playerCount || 0
        const prizes = trnprizes.filter((p) => {
          return p.tournament_id === tournament.id
        })
        const cashPrize =
          prizes?.reduce((acc, curr) => {
            const total = curr.prizes.reduce((a, b) => {
              return a + Number(b.amount)
            }, 0)
            return acc + Number(total)
          }, 0) || 0
        if (cashPrize) {
          tournament.cash_prize = cashPrize
        }
        const intentCount = intentCountMap.find((p) => {
          return p.tournament_id === tournament.id
        })?.user_count
        tournament.intent_count = intentCount
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

  getCirclechesssTournaments = async (userId, limit = 10, offset = 0) => {
    try {
      const message = 'Fetched tournaments successfully.'

      const data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          enable_registration: true,
          tournament_type: 'Circlechess_Online',
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

      const trnprizes = await this.tournamentPrizeMappingDao.findAllRaw({
        tournament_id: data.map((t) => {
          return t.id
        }),
      })
      // ✅ 2️⃣ Get players count
      const playerCountMap = await this.trnplayersDao.findCountByGroup(
        'tournament_id',
        'id',
        {
          tournament_id: data.map((t) => {
            return t.id
          }),
          is_withdrawn: false,
        }
      )

      const playerExitsMap = await this.trnplayersDao.findCountByGroup(
        'tournament_id',
        'id',
        {
          tournament_id: data.map((t) => {
            return t.id
          }),
          cc_userid: userId,
          is_withdrawn: false,
        }
      )
      if (
        data?.length > 0 &&
        userId &&
        data.some((d) => {
          return d.mandatory_club_membership_name || d.entry_fee > 0
        })
      ) {
        const [results] = await sequelize.query(`
        SELECT tournament_registration_id, id
        FROM cc_tournaments  
        WHERE id IN (${data
          .map((t) => {
            return t.cct_id || 0
          })
          .join(',')})
      `)

        const registrationsIdMap = results.reduce((acc, row) => {
          acc[row.id] = row.tournament_registration_id
          return acc
        }, {})

        const [players] = await sequelize.query(`
            SELECT tournament_id, player_id
            FROM cc_registration_orders  
            WHERE tournament_id IN (${data
              .map((t) => {
                return t.cct_id || 0
              })
              .join(',')})
          `)

        const playersIdMap = players.reduce((acc, row) => {
          acc[row.tournament_id] = row.player_id
          return acc
        }, {})
        const user = await this.CCUserDao.findOneByWhere({ user_id: userId })
        const [clubs] = await sequelize.query(`
            SELECT association_name
            FROM cc_association_registrations  
            WHERE mobile_number='${user.mobile_number}';
          `)
        const club_memberships = clubs.map((c) => {
          return c.association_name
        })
        const clubs_details = await this.tournamentDao.findByWhere({
          association_name: data.map((d) => {
            return d.mandatory_club_membership_name
          }),
        })

        data.forEach(async (tournament) => {
          delete tournament.player_fide_ids
          tournament.is_registered = !!playersIdMap[tournament.cct_id]
          tournament.is_free = !(
            registrationsIdMap[tournament.cct_id] &&
            (tournament.entry_fee > 0 ||
              (tournament.mandatory_club_membership_name &&
                !club_memberships.includes(
                  tournament.mandatory_club_membership_name
                )))
          )
          tournament.registration_tid =
            registrationsIdMap[tournament.cct_id] || null
          tournament.club = clubs_details.find((c) => {
            return (
              c.association_name === tournament.mandatory_club_membership_name
            )
          })
          const prizes = trnprizes.filter((p) => {
            return p.tournament_id === tournament.id
          })
          const cashPrize =
            prizes?.reduce((acc, curr) => {
              const total = curr.prizes.reduce((a, b) => {
                return a + Number(b.amount)
              }, 0)
              return acc + Number(total)
            }, 0) || 0
          tournament.cash_prize = cashPrize
          tournament.player_count = playerCountMap.find((p) => {
            return p.tournament_id === tournament.id
          })?.count
          tournament.is_joined =
            playerExitsMap.find((p) => {
              return p.tournament_id === tournament.id
            })?.count > 0
        })
      } else {
        data.forEach(async (tournament) => {
          delete tournament.player_fide_ids
          tournament.is_registered = false
          tournament.is_free = true
          tournament.registration_tid = null
          tournament.club = null
          const prizes = trnprizes.filter((p) => {
            return p.tournament_id === tournament.id
          })
          const cashPrize =
            prizes?.reduce((acc, curr) => {
              const total = curr.prizes.reduce((a, b) => {
                return a + Number(b.amount)
              }, 0)
              return acc + Number(total)
            }, 0) || 0
          tournament.cash_prize = cashPrize
          tournament.player_count = playerCountMap.find((p) => {
            return p.tournament_id === tournament.id
          })?.count
          tournament.is_joined =
            playerExitsMap.find((p) => {
              return p.tournament_id === tournament.id
            })?.count > 0
        })
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

  /**
   * Get Tournament List
   * @param {Number} id
   * @returns {Object}
   */

  getJoinedTournaments = async (userId) => {
    try {
      // Fetch all player entries in the TournamentPlayers table for the given user ID
      const playerEntries = await this.trnplayersDao.findByWhere({
        cc_userid: +userId,
      })

      if (!playerEntries || playerEntries.length === 0) {
        const message = `No tournaments found for user with cc_userId ${userId}`
        return responseHandler.returnSuccess(httpStatus.OK, message, [])
      }

      // Extract tournament IDs from the player entries
      const tournamentIds = playerEntries.map((entry) => {
        return entry.tournament_id
      })

      // Fetch tournament details for these tournament IDs
      const tournaments = await this.tournamentDao.findByWhere(
        {
          [Op.and]: [
            { id: tournamentIds },
            {
              id: {
                [Op.notIn]: literal(`(
            SELECT DISTINCT parent_id 
            FROM cc_tournament_chessmasters 
            WHERE parent_id IS NOT NULL
          )`),
              },
            },
          ],
        },
        undefined,
        ['start_date', 'desc']
      )

      // Structure the response
      const response = tournaments.map((tournament) => {
        return {
          id: tournament.id,
          name: tournament.name,
          start_date: tournament.start_date,
          end_date: tournament.end_date,
          location: tournament.location,
          rounds: tournament.rounds,
          time_control: tournament.time_control,
          time_format: TournamentService.classifyTimeControl(
            tournament.time_control
          ),
        }
      })

      return responseHandler.returnSuccess(
        httpStatus.OK,
        'Successfully fetched joined tournaments',
        response
      )
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong while fetching joined tournaments!'
      )
    }
  }

  getTournamentById = async (id, userId = null) => {
    try {
      const message = 'Fetched tournament details successfully.'

      // const redisResult = await this.redisService.getValue(
      //   `ccm_tournament_details_${id}`
      // )
      // if (redisResult) {
      //   return responseHandler.returnSuccess(
      //     httpStatus.OK,
      //     message,
      //     JSON.parse(redisResult)
      //   )
      // }
      // ✅ 1️⃣ Single findOne with JOINs
      const data = await this.tournamentDao.findOneWithIncludes(id)

      if (!data) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          "Tournament doesn't exist!"
        )
      }

      // Add Pairing Engine in response
      const trnConfig = await this.tournamentConfigurationDao.findOneByWhere(
        {
          tournament_id: id,
        },
        ['engine']
      )
      data.setDataValue('pairingEngine', trnConfig.engine || 'javafo')

      // ✅ 2️⃣ Get players count
      const playerCount = await this.trnplayersDao.getCountByWhere({
        tournament_id: id,
        is_withdrawn: false,
      })

      data.setDataValue('players_count', playerCount)

      let isJoined = false
      if (userId) {
        isJoined = await this.trnplayersDao.checkExist({
          cc_userid: userId,
          tournament_id: id,
          is_withdrawn: false,
        })
      }
      data.setDataValue('is_joined', isJoined)

      // ✅ 3️⃣ Use a single aggregate for pairings
      const pairings = await this.tournamentPairingsDao.findByGroup(
        { tournament_id: id },
        ['round'],
        [
          'round',
          [sequelize.fn('COUNT', sequelize.col('id')), 'pairing_count'],
          [
            sequelize.fn(
              'SUM',
              sequelize.literal('CASE WHEN is_scored = true THEN 1 ELSE 0 END')
            ),
            'scored_count',
          ],
        ]
      )
      const rounds = [...Array(data.rounds).keys()].reduce((acc, curr) => {
        if (pairings.length) {
          const pairing = pairings.find((p) => {
            return p.round === curr + 1
          })
          acc[curr + 1] = {
            paired: Number(pairing?.pairing_count) > 0,
            scored:
              Number(pairing?.pairing_count) === Number(pairing?.scored_count),
          }
        } else {
          acc[curr + 1] = {
            paired: false,
            scored: false,
          }
        }
        return acc
      }, {})

      let currentRound = data.current_round || 0
      const maxRound = Math.max(
        0,
        ...pairings.map((p) => {
          return p.round
        })
      )

      if (!data.current_round) {
        currentRound = maxRound
        if (
          pairings.some((p) => {
            return p.round === maxRound && p.pairing_count === p.scored_count
          })
        ) {
          currentRound += 1
        }
      }

      if (data.rounds < 0) {
        data.rounds = 5
      }

      data.setDataValue('pairings', rounds)
      data.setDataValue('currentRound', currentRound)

      // ✅ 4️⃣ Link for web
      if (data.feedback_key) {
        const feedbacks = await this.ccTournamentFeedbackDao.findByWhere({
          tournament_key: data.feedback_key,
        })
        data.setDataValue('feedbacks', feedbacks)
        data.setDataValue('tournamentKey', data.feedback_key)
        data.setDataValue(
          'weblink',
          `https://circlechess.com/events/tournaments/${data.state}/${data.city}/${data.name}/${data.feedback_key}`
        )
      }

      // ✅ 5️⃣ Sum prizes in JS if not precalculated
      const cashPrize =
        data.prizes?.reduce((acc, curr) => {
          const total = curr.prizes.reduce((a, b) => {
            return a + Number(b.amount)
          }, 0)
          return acc + Number(total)
        }, 0) || 0
      data.setDataValue('cash_prize', cashPrize)
      data.setDataValue('player_fide_ids', '')

      await this.redisService.setValueWithExpiry(
        `ccm_tournament_current_round_${id}`,
        86400,
        currentRound
      )

      await this.redisService.setValueWithExpiry(
        `ccm_tournament_details_${id}`,
        86400,
        JSON.stringify(data)
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
   * Get Club Membership List created by Organizer
   * @returns {Object}
   */
  getClubMembership = async (user) => {
    try {
      const message = 'Fetched all clubs successfully.'
      const where = { is_club_membership: 1 }
      if (user.role !== userRoles.ADMIN) {
        where.created_by = user.id
      }
      const data = await this.tournamentDao.findByWhere(where)
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
      const {
        limit = 8,
        offset = 0,
        start_date,
        end_date,
        type,
        ids,
        name,
      } = query
      const message = 'Fetched tournaments successfully.'
      const where = {}
      if (user.role !== userRoles.ADMIN) {
        where.created_by = user.id
      }
      if (ids) {
        where.id = ids.split(',')
      }
      if (name) {
        where.name = { [Op.iLike]: `%${name}%` }
      }
      if (start_date) {
        where.start_date = { [Op.gte]: moment(start_date) }
      }
      if (end_date) {
        where.end_date = { [Op.lte]: moment(end_date).add(1, 'd') }
      }
      if (type === 'clubs') {
        where.is_club_membership = 1
      } else if (type && type !== 'all') {
        where.tournament_type = type === 'offline' ? 'OTB' : { [Op.ne]: 'OTB' }
        where.is_club_membership = 0
      }

      const data = await this.tournamentDao.getDataTableData(
        where,
        limit,
        offset,
        [
          literal(
            `CASE WHEN "start_date" >= CURRENT_DATE THEN "start_date" ELSE NULL END ASC,CASE WHEN "start_date" < CURRENT_DATE THEN "start_date" ELSE NULL END DESC`
          ),
        ]
      )
      if (ids) {
        const playerCountMap = await this.trnplayersDao.findCountByGroup(
          'tournament_id',
          'id',
          {
            tournament_id: ids.split(','),
          }
        )

        const playersCountMap = playerCountMap.reduce((acc, curr) => {
          acc[curr.tournament_id] = curr.count
          return acc
        }, {})

        data.rows = data?.rows?.map((x) => {
          return {
            ...x.dataValues,
            player_count: playersCountMap[x.dataValues.id] || 0,
          }
        })
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

  static getNumberWithOrdinal = (n) => {
    const s = ['th', 'st', 'nd', 'rd']
    const v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }

  storePairingToRedis = async (tournamentId, round, data = []) => {
    let players = data
    if (data.length === 0) {
      const result = await this.tournamentPairingsDao.findPairings(
        round,
        tournamentId
      )
      console.log(`Pairings fetched from DB: Count = ${result.count}`)

      // === Attach team names if any ===
      const teams = await this.teamsDao.findByWhere({
        tournament_id: tournamentId,
      })
      console.log(`Teams fetched for tournament: Count = ${teams.length}`)

      const playerTeamMap = new Map()
      for (const team of teams) {
        for (const playerId of team.player_uuids) {
          playerTeamMap.set(playerId, team.name)
        }
      }

      players = result.rows.map((pair) => {
        return {
          pairing_id: pair.id,
          player: pair,
          opponent: pair.opponent || undefined,
          unpaired: pair.is_unpaired ? pair : undefined,
          teamA: playerTeamMap.get(pair.player_id),
          teamB: pair.opponent
            ? playerTeamMap.get(pair.opponent.player_id)
            : undefined,
        }
      })
    }
    console.log(`Saving Pairing in redis`)
    // === Save in Redis ===
    const hashKey = `ccm_pairings_${tournamentId}_${round}`
    const listKey = `ccm_pairings_order_${tournamentId}_${round}`
    const ongoingKey = `ccm_pairings_ongoing_${tournamentId}_${round}`

    console.log(
      `Saving fresh pairings to Redis: HASH=${hashKey}, LIST=${listKey}`
    )
    // === Remove if Already Exists ===
    await this.redisService.removeKey(hashKey)
    await this.redisService.removeKey(listKey)

    const hashFields = []
    for (const player of players) {
      const field = player.pairing_id
      hashFields.push(field, JSON.stringify(player))
      await this.redisService.rPush(listKey, String(field))
      // Storing in ongoingKey only after pairing creation
      if (data.length > 0) {
        await this.redisService.rPush(ongoingKey, String(field))
      }
    }

    await this.redisService.hSet(hashKey, hashFields)
    await this.redisService.expire(hashKey)
    await this.redisService.expire(listKey)

    console.log(`Pairings stored in Redis.`)
  }

  createTournamentPairingTest = async (round, tournamentId) => {
    try {
      console.log(
        `--- [createTournamentPairing] START | Round: ${round}, Tournament ID: ${tournamentId} ---`
      )

      let message = `Paired successfully for the ${TournamentService.getNumberWithOrdinal(
        round
      )} round of the tournament.`

      const tournament = await this.tournamentDao.findById(tournamentId)
      console.log(
        `Tournament fetched: ID=${tournament?.id}, Type=${tournament?.tournament_type}, Total Rounds=${tournament?.rounds}`
      )

      let players = await this.trnplayersDao.findByWhere({
        tournament_id: tournamentId,
      })
      console.log(`Players fetched: Count = ${players.length}`)
      if (tournament.tournament_type === 'Circlechess_Online') {
        console.log(`Checking for duplicate CC users...`)
        const seen = new Set()
        const duplicateIds = []

        players.forEach((player) => {
          if (player.cc_userid && seen.has(player.cc_userid)) {
            duplicateIds.push(player.id) // mark for deletion
          } else if (player.cc_userid) {
            seen.add(player.cc_userid)
          } else {
            duplicateIds.push(player.id) // falsy cc_userid (e.g. 0, null)
          }
        })

        if (duplicateIds.length > 0) {
          // Delete all duplicates from DB
          await this.trnplayersDao.deleteByWhere({ id: duplicateIds })

          logger.info(
            `Deleted ${duplicateIds.length} duplicate player(s) in tournament ${tournamentId}`
          )

          // Remove them from in-memory list
          players = players.filter((player) => {
            return !duplicateIds.includes(player.id)
          })
        }
      }

      if (round > tournament.rounds) {
        message = 'Pairing already done for all rounds in the tournament.'
        console.log(message)
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (!players.length) {
        message =
          'The pairing process cannot be initiated as there are no players available for matching. Please upload player information first.'
        console.log(message)
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const data = []

      const white = []
      const black = []
      const ranking = {}
      const lastRoundPairings = []

      const teams = []

      const tnrConfig = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: tournamentId,
      })
      console.log(`Tournament config fetched: Sorting=${tnrConfig?.sorting}`)

      try {
        const { whitePlayers, blackPlayers, leftTeams, rightTeams } =
          await javaFoRoundPairing(
            players,
            round,
            tournament,
            white,
            black,
            ranking,
            tnrConfig,
            teams
          )

        if (!whitePlayers) {
          message = 'Failed to pair players! Please try again.'
          console.log(message)
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        return responseHandler.returnSuccess(httpStatus.OK, message, data)
      } catch (error) {
        console.error(`[createTournamentPairing] ERROR in try block:`, error)
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          error.message
        )
      }
    } catch (e) {
      console.error(`[createTournamentPairing] Uncaught ERROR:`, e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Create Tournament Pairing
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  createTournamentPairing = async (round, tournamentId) => {
    try {
      console.log(
        `--- [createTournamentPairing] START | Round: ${round}, Tournament ID: ${tournamentId} ---`
      )

      let message = `Paired successfully for the ${TournamentService.getNumberWithOrdinal(
        round
      )} round of the tournament.`

      const tournament = await this.tournamentDao.findById(tournamentId)
      console.log(
        `Tournament fetched: ID=${tournament?.id}, Type=${tournament?.tournament_type}, Total Rounds=${tournament?.rounds}`
      )

      let players = await this.trnplayersDao.findByWhere({
        tournament_id: tournamentId,
      })

      if (!players.length) {
        message =
          'The pairing process cannot be initiated as there are no players available for matching. Please upload player information first.'
        console.log(message)
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (players.length > 500) {
        await this.tournamentConfigurationDao.updateByWhere(
          { engine: 'bbpPairing' },
          { tournament_id: tournamentId }
        )
      }
      const trnConfig = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: tournamentId,
      })

      if (round === 1 && trnConfig.engine === 'bbpPairing') {
        await this.trnplayersDao.deleteByWhere({
          tournament_id: tournamentId,
          is_withdrawn: true,
        })
      }

      console.log(`Players fetched: Count = ${players.length}`)
      if (tournament.tournament_type === 'Circlechess_Online') {
        console.log(`Checking for duplicate CC users...`)
        const seen = new Set()
        const duplicateIds = []

        players.forEach((player) => {
          if (player.cc_userid && seen.has(player.cc_userid)) {
            duplicateIds.push(player.id) // mark for deletion
          } else if (player.cc_userid) {
            seen.add(player.cc_userid)
          } else {
            duplicateIds.push(player.id) // falsy cc_userid (e.g. 0, null)
          }
        })

        if (duplicateIds.length > 0) {
          // Delete all duplicates from DB
          await this.trnplayersDao.deleteByWhere({ id: duplicateIds })

          logger.info(
            `Deleted ${duplicateIds.length} duplicate player(s) in tournament ${tournamentId}`
          )

          // Remove them from in-memory list
          players = players.filter((player) => {
            return !duplicateIds.includes(player.id)
          })
        }
      }

      if (round > tournament.rounds) {
        message = 'Pairing already done for all rounds in the tournament.'
        console.log(message)
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const pairingData = await this.tournamentPairingsDao.getCountByWhere({
        round,
        tournament_id: tournamentId,
      })

      console.log(
        `Pairings already exist for this round? Count = ${pairingData}`
      )

      if (pairingData > 0) {
        message = `The pairing of players already done for the ${TournamentService.getNumberWithOrdinal(
          round
        )} round.`
        const res = await this.getPairings(
          round,
          tournamentId,
          pairingData,
          0,
          '',
          false,
          null,
          message
        )
        return res
      }

      let data = []

      let white = []
      let black = []
      let ranking = {}
      let lastRoundPairings = []

      if (round > 1) {
        console.log(`Fetching last round pairings and computing ranking.`)

        let pairing = []

        const allRoundPairingKey = `ccm_all_round_pairings_${tournamentId}`
        const pairings = await this.redisService.getValue(allRoundPairingKey)
        pairing = JSON.parse(pairings)

        if (!pairing?.length) {
          pairing = await this.tournamentPairingsDao.findByWhere({
            round: { [Op.lt]: round },
            tournament_id: tournamentId,
          })
        }

        lastRoundPairings = pairing.filter((p) => {
          return p.round === round - 1
        })
        pairing = convertPlayersResultInNumeric(pairing, trnConfig)
        const playersRanking = getTieBreaks(pairing, round - 1, trnConfig)

        ranking = playersRanking.reduce((a, b, i) => {
          a[b.player_id] = i + 1
          return a
        }, {})

        if (!pairing.length) {
          message = `The pairing of players for the ${TournamentService.getNumberWithOrdinal(
            round - 1
          )} round is not done yet. Please generate paring of it.`
          console.log(message)
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
        console.log(
          `Previous round pairing breakdown: White=${white.length}, Black=${black.length}`
        )
      }
      //   const { whitePlayers, blackPlayers } = swissOtherRoundPairings(
      //     players.concat(newPlayers),
      //     opponents,
      //     round,
      //     tournamentId
      //   )

      let teams = []
      if (tournament.pairing_type === 'Team') {
        teams = await this.teamsDao.findByWhere({ tournament_id: tournamentId })
        const minPlayerCount = Math.min(
          ...teams.map((t) => {
            return t.player_uuids.length
          })
        )
        const teamPairings = []
        teams.forEach((t) => {
          teamPairings.push({
            team_id: t.id,
            tournament_id: tournamentId,
            round,
          })
          let teamPlayerUuids = t.player_uuids
          if (lastRoundPairings.length) {
            teamPlayerUuids = lastRoundPairings
              .filter((lrp) => {
                return teamPlayerUuids.includes(lrp.player_id)
              })
              .map((lrp) => {
                return lrp.player_id
              })
          }

          const existingPlayerIds = t.player_uuids.filter((p) => {
            return !teamPlayerUuids.includes(p)
          })
          const playerUuids = players
            .filter((p) => {
              return teamPlayerUuids.includes(p.id)
            })
            .sort((a, b) => {
              return b.rating - a.rating
            })
            .map((p) => {
              return p.id
            })
          t.player_uuids = existingPlayerIds
            .concat(playerUuids)
            .slice(0, minPlayerCount)
          const totalRatings = players
            .filter((p) => {
              return t?.player_uuids?.includes(p.id)
            })
            .reduce((tr, p) => {
              return tr + Number(p.rating || 0)
            }, 0)
          t.rating = totalRatings / minPlayerCount
        })
      }

      console.log(`Tournament config fetched: Sorting=${trnConfig?.sorting}`)
      if (trnConfig.sorting) {
        const sortedPlayers = sortByInitialRankings(players)
        const startingRanks = sortedPlayers.map((p, i) => {
          return {
            round: Number(round),
            tournament_id: tournamentId,
            player_id: p.id,
            rank: i + 1,
          }
        })
        await this.playerStartingRankDao.bulkCreate(startingRanks)
        console.log(`Players sorted and starting ranks saved.`)
        players = sortedPlayers
      } else {
        const lastRound = await this.playerStartingRankDao.max('round', {
          tournament_id: tournamentId,
        })
        const startingRanks = await this.playerStartingRankDao.findByWhere({
          round: lastRound,
          tournament_id: tournamentId,
        })
        players = players.sort((a, b) => {
          const aRank = startingRanks.find((s) => {
            return s.player_id === a.id
          })
          const bRank = startingRanks.find((s) => {
            return s.player_id === b.id
          })
          return (aRank?.rank ?? 0) - (bRank?.rank ?? 0)
        })
        console.log(`Players sorted based on last round starting rank.`)
      }
      try {
        const paringinInQueue = await this.redisService.getValue(
          `ccm_pairing_queue_${tournamentId}_${round}`
        )
        if (paringinInQueue) {
          message = 'Pairing already in the process. Please wait!'
          console.log(message)
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        await this.redisService.setAtomicValue(
          `ccm_pairing_queue_${tournamentId}_${round}`,
          moment().toISOString(),
          60
        )
        console.log(`Pairing lock acquired in Redis.`)
        const { whitePlayers, blackPlayers, leftTeams, rightTeams } =
          await javaFoRoundPairing(
            players,
            round,
            tournament,
            white,
            black,
            ranking,
            trnConfig,
            teams
          )

        if (!whitePlayers) {
          message = 'Failed to pair players! Please try again.'
          console.log(message)
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        console.log(`Pairing completed. Saving white players.`)
        const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
        console.log(`White Players pairings saved.`)
        await this.tournamentConfigurationDao.updateWhere(
          { sorting: false },
          {
            tournament_id: tournamentId,
          }
        )
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
        console.log(`Black Players pairings saved.`)
        await this.tournamentDao.updateById(
          { current_round: Number(round), new_player_added: false },
          tournamentId
        )

        console.log(`Tournament current round updated to ${round}`)
        if (teams.length) {
          const whiteTeams = leftTeams.map((lt) => {
            return {
              team_id: lt,
              tournament_id: tournamentId,
              round,
            }
          })
          const teamsRes = await this.teamPairingsDao.bulkCreate(whiteTeams)

          if (teamsRes) {
            const blackTeams = rightTeams.map((lt, i) => {
              return {
                team_id: lt,
                tournament_id: tournamentId,
                round,
                parent_id: teamsRes[i].id,
              }
            })
            await this.teamPairingsDao.bulkCreate(blackTeams)
          }
        }

        data = res.map((w, i) => {
          return {
            pairing_id: w.id,
            player: w,
            opponent: oppRes[i] || null,
            unpaired: w.is_unpaired ? w : undefined,
            teamA: teams?.find((t) => {
              return t.player_uuids.includes(w.player_id)
            })?.name,
            teamB: teams?.find((t) => {
              return t.player_uuids.includes(oppRes[i]?.player_id)
            })?.name,
          }
        })

        this.storePairingToRedis(tournamentId, round, data)

        console.log(`Pairings prepared for response.`)
        await this.redisService.removeKey(
          `ccm_tournament_details_${tournamentId}`
        )
        console.log(`Tournament cache cleared.`)

        // await this.redisService.removeKey(
        //   `ccm_pairing_queue_${tournamentId}_${round}`
        // )
        return responseHandler.returnSuccess(httpStatus.OK, message, data)
      } catch (error) {
        await this.redisService.removeKey(
          `ccm_pairing_queue_${tournamentId}_${round}`
        )
        console.error(`[createTournamentPairing] ERROR in try block:`, error)
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          error.message
        )
      }
    } catch (e) {
      console.error(`[createTournamentPairing] Uncaught ERROR:`, e)
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
      logger.info(
        `Reverting pairing data for round : ${tournament.current_round} of tournamentId: ${tournamentId}`
      )

      let new_player_added = false
      if (tournament.current_round > 1) {
        const currentCount = await this.tournamentPairingsDao.getCountByWhere({
          round: tournament.current_round,
          tournament_id: tournamentId,
        })
        const prevCount = await this.tournamentPairingsDao.getCountByWhere({
          round: tournament.current_round - 1,
          tournament_id: tournamentId,
        })
        if (currentCount > prevCount) {
          new_player_added = true
        }
      }
      await this.tournamentPairingsDao.deleteByWhere({
        round: tournament.current_round,
        tournament_id: tournamentId,
      })
      await this.playerStartingRankDao.deleteByWhere({
        round: tournament.current_round,
        tournament_id: tournamentId,
      })
      await this.tournamentDao.updateById(
        {
          current_round:
            tournament.current_round > 0 ? tournament.current_round - 1 : 0,
          new_player_added,
        },
        tournamentId
      )
      if (tournament.current_round === 1) {
        await this.tournamentConfigurationDao.updateWhere(
          { sorting: true },
          {
            tournament_id: tournamentId,
          }
        )
      }

      // Removes pairings & standings from Redis cache
      const round = tournament.current_round
      const redisResult = await this.redisService.setValueWithExpiry(
        `ccm_tournament_current_round_${tournament.id}`,
        86400,
        round - 1
      )
      await this.redisService.removeKey(
        `ccm_pairing_queue_${tournamentId}_${round}`
      )
      const redisKey = `ccm_pairings_${tournamentId}_${round}`
      await this.redisService.removeKey(redisKey)
      const standingsKey = `ccm_standings_${tournamentId}_${round}`
      await this.redisService.removeKey(standingsKey)
      const trnKey = `ccm_tournament_details_${tournamentId}`
      await this.redisService.removeKey(trnKey)

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
  getPairings = async (
    round,
    tournamentId,
    limit = 20,
    offset = 0,
    search = '',
    ongoing = false,
    userId = null,
    msg = undefined
  ) => {
    try {
      console.log(
        `--- [getPairings] START | Tournament ID: ${tournamentId}, Round: ${round}, Limit: ${limit}, Offset: ${offset} Ongoing: ${ongoing}  SearchKeyword: ${search} ---`
      )

      let message = 'Fetched tournament player pairings successfully.'
      if (msg) {
        message = msg
        console.log(`Custom message supplied: ${msg}`)
      }
      let pageNumber

      if (search.length === 0) {
        const hashKey = `ccm_pairings_${tournamentId}_${round}`
        let listKey = `ccm_pairings_order_${tournamentId}_${round}`

        if (ongoing) {
          listKey = `ccm_pairings_ongoing_${tournamentId}_${round}`
        }
        const totalPairings = await this.redisService.lLen(listKey)
        if (totalPairings > 0) {
          if (userId) {
            console.log(`Pairings for UserId: ${userId}`)
            const userData = await this.tournamentPairingsDao.findOneByWhere({
              cc_userid: userId,
              tournament_id: tournamentId,
              round,
            })

            let pairingId = userData.id
            if (userData.parent_id) {
              pairingId = userData.parent_id
            }
            const list = await this.redisService.lRange(listKey, 0, -1)

            // Find index in JS
            const index = list.indexOf(String(pairingId))
            offset = Math.floor(index / limit) * limit
            pageNumber = Math.floor(index / limit) + 1
            console.log(
              `Page Number Found for User:${userId} Page:${pageNumber}`
            )
          }

          const start = offset
          const end = start + limit - 1

          console.log(`Checking Redis keys: HASH=${hashKey}, LIST=${listKey}`)

          const pairingIds = await this.redisService.lRange(listKey, start, end)
          console.log(
            `Pairing IDs from Redis LIST: Count = ${pairingIds.length}`
          )

          let redisResults = []
          if (pairingIds.length) {
            const pairings = await this.redisService.hmGet(hashKey, pairingIds)
            redisResults = pairings.map(JSON.parse)
            console.log(
              `Pairings fetched from Redis HASH: Count = ${redisResults.length}`
            )
            console.log(`Total pairings in Redis LIST: ${totalPairings}`)

            if (redisResults.length) {
              console.log(`Returning pairings from Redis cache.`)
              return responseHandler.returnSuccess(
                httpStatus.OK,
                message,
                redisResults,
                totalPairings,
                pageNumber
              )
            }
          }
        }
        console.log(`No cached pairings found. Querying DB...`)
      }

      if (userId) {
        console.log(`Pairings for UserId: ${userId}`)
        const userData = await this.tournamentPairingsDao.findOneByWhere({
          cc_userid: userId,
          tournament_id: tournamentId,
          round,
        })

        let pairingId = userData.id
        if (userData.parent_id) {
          pairingId = userData.parent_id
        }
        const list = await this.tournamentPairingsDao.findByWhere(
          {
            parent_id: null,
            round,
            tournament_id: tournamentId,
          },
          ['id']
        )

        // Find index in JS
        const index = list
          .map((l) => {
            return l.id
          })
          .indexOf(pairingId)
        offset = Math.floor(index / limit) * limit
        pageNumber = Math.floor(index / limit) + 1

        console.log(`Page Number Found for User:${userId} Page:${pageNumber}`)
      }

      const data = await this.tournamentPairingsDao.findPairings(
        round,
        tournamentId,
        limit,
        offset,
        ongoing,
        search
      )

      if (!data.count) {
        if (ongoing) {
          message = `There is no Ongoing Games for round ${round}.`
          console.log(message)
          return responseHandler.returnSuccess(
            httpStatus.OK,
            message,
            data.rows,
            data.count
          )
        }
        message = `Pairing of Round ${round} is not done yet! Please try again.`
        console.log(message)
        // return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        return responseHandler.returnSuccess({ data: [], message })
      }

      console.log(`Pairings fetched from DB: Count = ${data.count}`)

      // === Attach team names if any ===
      const teams = await this.teamsDao.findByWhere({
        tournament_id: tournamentId,
      })
      console.log(`Teams fetched for tournament: Count = ${teams.length}`)

      const playerTeamMap = new Map()
      for (const team of teams) {
        for (const playerId of team.player_uuids) {
          playerTeamMap.set(playerId, team.name)
        }
      }

      const players = data.rows.map((pair) => {
        return {
          pairing_id: pair.id,
          player: pair,
          opponent: pair.opponent || undefined,
          unpaired: pair.is_unpaired ? pair : undefined,
          teamA: playerTeamMap.get(pair.player_id),
          teamB: pair.opponent
            ? playerTeamMap.get(pair.opponent.player_id)
            : undefined,
        }
      })

      console.log(`Final pairings mapped with teams.`)

      this.storePairingToRedis(tournamentId, round)

      console.log(`--- [getPairings] END | SUCCESS ---`)
      return responseHandler.returnSuccess(
        httpStatus.OK,
        message,
        players,
        data.count,
        pageNumber
      )
    } catch (e) {
      logger.error(`[getPairings] ERROR:`, e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  /**
   * Remove paired player from Pairing for particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @param {Number} player_id
   * @param {Number} opponent_id
   * @returns {Array}
   */
  removePairings = async (round, tournamentId, player_id, opponent_id) => {
    try {
      let message = 'Successfully removed player from this board'
      if (player_id && opponent_id) {
        message = 'Successfully removed selected board from this round'
      }
      const where = {
        round,
        tournament_id: tournamentId,
      }
      if (player_id) {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: true },
          { ...where, id: player_id }
        )
        await this.removePairingsFromRedis(tournamentId, round, player_id)
      }
      if (opponent_id) {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: true, parent_id: null },
          { ...where, id: opponent_id }
        )
        await this.removePairingsFromRedis(tournamentId, round, opponent_id)
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
   * Add unpaired paired player to existing or new board pairing
   * @param {Number} round
   * @param {Number} tournamentId
   * @param {Array} player_uuids
   * @returns {Array}
   */
  addPairings = async (round, tournamentId, player_id, opponent_id, type) => {
    try {
      let message = 'Successfully added player to this board'
      const where = {
        round,
        tournament_id: tournamentId,
      }
      let parent_id = player_id || opponent_id
      if (type === 'add') {
        message = 'Successfully added new board pairing'
        const player_data = await this.tournamentPairingsDao.findOneByWhere(
          { id: parent_id },
          [
            'round',
            'tournament_id',
            'player_fide_id',
            'player_id',
            'player_name',
            'player_rating',
            'player_score',
          ]
        )
        await this.tournamentPairingsDao.deleteByWhere({ id: parent_id })
        await this.removePairingsFromRedis(tournamentId, round, parent_id)
        const new_player = await this.tournamentPairingsDao.create(player_data)
        parent_id = new_player.dataValues.id
        await this.addPairingInRedis(
          tournamentId,
          round,
          parent_id,
          player_data
        )
      } else {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: false, is_withdrawn: false },
          { ...where, id: player_id }
        )
      }
      if (opponent_id && opponent_id !== parent_id) {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: false, parent_id },
          { ...where, id: opponent_id }
        )
        await this.updatePairingInRedis(tournamentId, round, opponent_id, {
          is_unpaired: false,
          parent_id,
        })
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

  filterStandings = async (
    output,
    round,
    tournamentId,
    limit = 2000,
    offset = 0,
    search = '',
    userId = null
  ) => {
    const message = `Fetched players ranking after round ${round} successfully.`

    if (search.length > 0) {
      output = output.filter((r) => {
        return r.player_name.includes(search)
      })
    }

    let pageNumber
    if (userId) {
      console.log(`Standings Old for UserId: ${userId}`)
      const userData = output.find((o) => {
        return o.cc_userid === userId
      })
      // Find index in JS
      if (userData) {
        const index = Number(userData.rank) - 1
        offset = Math.floor(index / limit) * limit
        pageNumber = Math.floor(index / limit) + 1
        console.log(`Page Number Found for User:${userId} Page:${pageNumber}`)
      }
    }

    const total = output.length

    return responseHandler.returnSuccess(
      httpStatus.OK,
      message,
      output.slice(offset, offset + limit),
      total,
      pageNumber
    )
  }

  /**
   * Get Tournament Players Ranking after particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPlayersRanking = async (
    round,
    tournamentId,
    limit = 20,
    offset = 0,
    search = '',
    userId = null
  ) => {
    try {
      console.log(
        `--- [getPlayersRanking] START | Tournament ID: ${tournamentId}, Round: ${round}, Limit: ${limit}, Offset: ${offset} SearchTerm: ${search}---`
      )

      let message = `Fetched players ranking after round ${round} successfully.`

      // fetch and populate current_round
      const currRndRedisResult = await this.redisService.getValue(
        `ccm_tournament_current_round_${tournamentId}`
      )
      const trnRedisResult = await this.redisService.getValue(
        `ccm_tournament_details_${tournamentId}`
      )

      let current_round = 1
      let tournament
      if (trnRedisResult) {
        tournament = JSON.parse(trnRedisResult)
        current_round = Number(tournament.current_round)
      } else {
        tournament = await this.tournamentDao.findById(tournamentId)
        current_round = tournament.current_round
      }
      if (!currRndRedisResult) {
        await this.redisService.setValueWithExpiry(
          `ccm_tournament_current_round_${tournamentId}`,
          86400,
          tournament.curent_round
        )
      }

      // reset and adjust the input round value appropriately
      if (Number(current_round) < Number(round) && round > 1) {
        const scoreUploadKey = `ccm_score_upload_${tournamentId}_${round}`
        const scoreUploaded =
          (await this.redisService.getValue(scoreUploadKey)) || 0
        round = Number(scoreUploaded) > 0 ? current_round : round - 1
      } else if (round <= 1 || !round) {
        round = 1
      }

      // not possible, safe guard
      if (!tournament) {
        message = `Tournament not found!`
        console.log('get_player_ranking : tournament not found')
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      // check if it is old tournament and return ranking
      if (
        moment(tournament.start_date).diff(moment('2025-07-13'), 'days') <= 0
      ) {
        return await this.getPlayersRankingLatest(
          current_round,
          round,
          tournamentId,
          limit,
          offset,
          search,
          userId,
          tournament.pairing_type
        )
      }

      let keyToCheck = `ccm_standings_ttl_${tournamentId}`
      let ttlExists = await this.redisService.getValue(keyToCheck)

      if (round < current_round) {
        keyToCheck = `ccm_standings_${tournamentId}_${round}`
        ttlExists = await this.redisService.lLen(keyToCheck)
      }

      console.log('ttlExists is ', ttlExists)
      console.log('userId is ', !userId)
      console.log('round is ', round)
      console.log('current_round is ', current_round)

      try {
        if (ttlExists) {
          const redisKey = `ccm_standings_${tournamentId}_${round}`
          let totalPlayers = await this.redisService.lLen(redisKey)
          console.log(`Checking Redis key: ${redisKey}`)

          let start = offset
          let end = start + limit - 1

          if (search.length || userId) {
            start = 0
            end = -1
          }
          const players = await this.redisService.lRange(redisKey, start, end)

          let redisResults = players.map(JSON.parse)
          // let totalPlayers = redisResults.length

          let pageNumber
          if (userId) {
            const userData = redisResults.find((o) => {
              return o.cc_userid === Number(userId)
            })
            const index = Number(userData.rank) - 1
            pageNumber = Math.floor(index / limit) + 1
            start = Math.floor(index / limit) * limit
            end = start + limit
            redisResults = redisResults.slice(start, end)
          } else if (search.length) {
            redisResults = redisResults.filter((r) => {
              return r.player_name.includes(search)
            })
            totalPlayers = redisResults.length
            start = offset
            end = start + limit
            redisResults = redisResults.slice(start, end)
          }

          console.log(
            `Total players in Redis LIST: ${totalPlayers} results returned count : ${redisResults.length}`
          )

          return responseHandler.returnSuccess(
            httpStatus.OK,
            message,
            redisResults,
            totalPlayers,
            pageNumber
          )
        }
      } catch (e) {
        console.log('get_player_ranking : Exception inside function ', e)
      }

      console.log(`--- [getPlayersRanking] END | SUCCESS ---`)
      return await this.getPlayersRankingLatest(
        current_round,
        round,
        tournamentId,
        limit,
        offset,
        search,
        userId,
        tournament.pairing_type
      )
    } catch (e) {
      console.log('get_player_ranking : Exception inside function ', e)
      logger.error(`[getPlayersRanking] ERROR:`, e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  getPlayersRankingLatest = async (
    current_round,
    round,
    tournamentId,
    limit = 2000,
    offset = 0,
    search = '',
    userId = null,
    pairing_type = ''
  ) => {
    try {
      let message = `Fetched players ranking after round ${round} successfully.`
      let result
      let output

      const scoreUploadKey = `ccm_score_upload_${tournamentId}_${round}`
      const scoreUploaded = await this.redisService.getValue(scoreUploadKey)
      // fetch player and standings details from database

      if (
        Number(scoreUploaded) > 0 &&
        Number(round) === Number(current_round)
      ) {
        console.log('inside latest standings')
        // It's latest round so fetch last round pairing and update with rounds of current round results, calculate tie-break and then store results
        let data = []
        let allPairingDataExist = true

        for (let index = 1; index <= round; index += 1) {
          const hashKey = `ccm_pairings_${tournamentId}_${index}`
          const listKey = `ccm_pairings_order_${tournamentId}_${index}`
          const pairingIds = await this.redisService.lRange(listKey, 0, -1)
          console.log(
            `Pairing IDs from Redis LIST: Count = ${pairingIds.length}`
          )

          if (pairingIds.length) {
            const pairings = await this.redisService.hmGet(hashKey, pairingIds)
            const redisResults = pairings.map(JSON.parse)
            const pairingResult = redisResults
              .map((r) => {
                delete r.player.opponent
                const { player } = r
                const { opponent } = r
                return [player, opponent]
              })
              .flat()
              .filter((x) => {
                return x
              })
            data = data.concat(pairingResult)
          } else {
            allPairingDataExist = false
            break
          }
        }

        if (!allPairingDataExist) {
          data = await this.tournamentPairingsDao.findByWhere({
            round: { [Op.lte]: round },
            tournament_id: tournamentId,
          })
          this.storePairingToRedis(tournamentId, round)
        }

        if (!data?.length) {
          message = `No players found for Round ${round}! Please try again.`
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        const tnrConfigKey = `ccm_trn_config_${tournamentId}`
        const tnrConfigRedisResult = await this.redisService.getValue(
          tnrConfigKey
        )
        let trnConfig = JSON.parse(tnrConfigRedisResult)

        if (!trnConfig) {
          trnConfig = await this.tournamentConfigurationDao.findOneByWhere({
            tournament_id: tournamentId,
          })
          await this.redisService.setValueWithExpiry(
            tnrConfigKey,
            86400,
            JSON.stringify(trnConfig)
          )
        }

        let teamsData
        if (pairing_type === 'Team') {
          teamsData = await this.teamPairingsDao.findByWhere({
            round: { [Op.lte]: round },
            tournament_id: tournamentId,
          })
        }

        if (teamsData?.length) {
          result = getTieBreaks(teamsData, round, trnConfig)
        } else {
          const convertedData = convertPlayersResultInNumeric(data, trnConfig)
          result = getTieBreaks(convertedData, round, trnConfig)
        }

        output = result.map((player, i) => {
          return { ...player, rank: i + 1 }
        })
      } else if (Number(scoreUploaded) === 0 && round === 1) {
        // if it is first round, compute from starting rank of players since there is no data in the standings and pairing table

        console.log('Fetching Players when Standings not exists')
        const players = await this.trnplayersDao.findByWhere({
          tournament_id: tournamentId,
        })
        const sortedPlayers = sortByInitialRankings(players)
        const startingRanks = sortedPlayers.map((p, i) => {
          return {
            round: Number(round),
            tournament_id: tournamentId,
            player_id: p.id,
            rank: i + 1,
            player_name: p?.name,
            player_title: p?.title,
            player_rating: p?.rating,
            cc_userid: p.cc_userid,
            point: 0,
            TB1: 0,
            TB2: 0,
            TB3: 0,
          }
        })

        output = startingRanks
        result = startingRanks
      } // fetch from standings table since it's already stored in the database for previous rounds.
      else {
        const results = await this.tournamentStandingsDao.findAndCountAll(
          round,
          tournamentId,
          10000,
          0,
          ''
        )

        if (!results.count) {
          message = `No players standings found for Round ${round}! Please try again.`
          console.log(message)
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        console.log(`Total player standings in DB: ${results.count}`)
        output = results.rows.map((r) => {
          return { ...r, ...r.tie_breaks }
        })
      }

      // whatever be the results computed, save that in the cache.
      const lockKey = `ccm_standings_write_lock_${tournamentId}_${round}`
      const alreadyWriting = await this.redisService.getValue(lockKey)

      if (!alreadyWriting) {
        await this.redisService.setAtomicValue(lockKey, '1', 10)

        const listKey = `ccm_standings_${tournamentId}_${round}`
        await this.redisService.removeKey(listKey)

        const rPushPromises = output.map((player, i) => {
          return this.redisService.rPush(listKey, JSON.stringify(player))
        })

        await Promise.allSettled(rPushPromises)

        await this.redisService.expire(listKey) // Set expiration if needed

        if (round === current_round) {
          const ttlKey = `ccm_standings_ttl_${tournamentId}`
          await this.redisService.setValueWithExpiry(
            ttlKey,
            60,
            'recalculate_standing'
          )
        }
      }

      return await this.filterStandings(
        output,
        round,
        tournamentId,
        limit,
        offset,
        search,
        userId
      )
    } catch (e) {
      console.log('get_player_ranking : getPlayersRankingLatest 3: ', e)
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  verifyPassword = async (tournamentId, password) => {
    try {
      let message = 'Password verified successfully.'
      const tournament = await this.tournamentDao.findById(tournamentId)
      const isPasswordValid = await bcrypt.compare(
        password,
        tournament.password
      )

      if (!isPasswordValid) {
        message = 'Wrong Password!'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      return responseHandler.returnSuccess(httpStatus.OK, message)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  updateCirclechessTournament = async (tournamentId, tournamentBody) => {
    try {
      const message = `Updated tournament Status successfully.`
      const tournamentUpdate = await this.tournamentDao.updateById(
        tournamentBody,
        tournamentId
      )
      return responseHandler.returnSuccess(
        httpStatus.OK,
        message,
        tournamentUpdate
      )
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  updatePairingTableId = async (id, body) => {
    try {
      console.log(`--- [updatePairingTableId] START | Pairing ID: ${id} ---`)
      console.log(`Update payload:`, JSON.stringify(body))

      const message = `Updated tournament Status successfully.`

      await this.tournamentPairingsDao.updateById(body, id)
      console.log(`Pairing updated in DB for ID: ${id}`)

      const data = await this.tournamentPairingsDao.findById(id)
      console.log(
        `Fetched updated pairing:`,
        JSON.stringify({
          id: data.id,
          tournament_id: data.tournament_id,
          round: data.round,
        })
      )

      await this.updatePairingInRedis(data.tournament_id, data.round, id, body)
      console.log(`Pairing updated in Redis.`)

      console.log(`--- [updatePairingTableId] END | SUCCESS ---`)
      return responseHandler.returnSuccess(httpStatus.OK, message)
    } catch (e) {
      logger.error(`[updatePairingTableId] ERROR:`, e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  reCalculateStandingsPrizes = async (round, tournamentId, rounds) => {
    console.log(
      `--- [reCalculateStandingsPrizes] START | Tournament ID: ${tournamentId}, Round: ${round}, Total Rounds: ${rounds} ---`
    )
    console.log(
      `Recalculating standings and prizes for tournament: ${tournamentId}, round: ${round}`
    )
    const pendingScoreToUpload = await this.tournamentPairingsDao.checkExist({
      round,
      tournament_id: tournamentId,
      is_scored: false,
    })
    console.log(`Pending scores to upload: ${pendingScoreToUpload}`)
    if (!pendingScoreToUpload) {
      console.log(`All scores submitted. Recalculating standings.`)
      const scoreUploadKey = `ccm_score_upload_${tournamentId}_${round}`
      await this.redisService.setValueWithExpiry(scoreUploadKey, 86400, '0')
      const data = await this.tournamentPairingsDao.findWithPlayers({
        round: { [Op.lte]: round },
        tournament_id: tournamentId,
      })

      if (!data?.length) {
        console.log(`No players found for Round ${round}! Please try again.`)
        return
      }
      console.log(`Fetched pairings for standings: Count = ${data.length}`)
      const trnConfig = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: tournamentId,
      })
      const convertedData = convertPlayersResultInNumeric(data, trnConfig)
      const players = getTieBreaks(convertedData, round, trnConfig)

      const standingExists = await this.tournamentStandingsDao.checkExist({
        round,
        tournament_id: tournamentId,
      })
      console.log(`Standings already exist?`, standingExists)
      if (!standingExists) {
        await this.tournamentStandingsDao.bulkCreate(
          players.map((p, i) => {
            return {
              ...p,
              rank: i + 1,
            }
          })
        )
        console.log(`Standings created.`)
      } else {
        await this.tournamentStandingsDao.deleteByWhere({
          round,
          tournament_id: tournamentId,
        })
        await this.tournamentStandingsDao.bulkCreate(
          players.map((p, i) => {
            return {
              ...p,
              rank: i + 1,
            }
          })
        )
        console.log(`Standings replaced.`)
      }

      const redisResult = await this.redisService.setValueWithExpiry(
        `ccm_tournament_current_round_${tournamentId}`,
        86400,
        round + 1
      )

      const listKey = `ccm_standings_${tournamentId}_${round}`
      console.log(
        `Removing and resettings during round pairing process .`,
        listKey
      )
      await this.redisService.removeKey(listKey) // Clear old list
      const rPushPromises = players.map((player, i) => {
        // Push only player ID or JSON if you want
        return this.redisService.rPush(
          listKey,
          JSON.stringify({ ...player, rank: i + 1 })
        )
      })
      await Promise.all(rPushPromises)
      await this.redisService.expire(listKey) // Set expiration if needed

      // Removes pairings from Redis cache
      if (rounds === Number(round)) {
        console.log(`Final round detected. Updating prize payouts.`)
        const tournamentPrizeCategoryMappings =
          await this.tournamentPrizeMappingDao.findAllWithCategory({
            tournament_id: tournamentId,
          })
        console.log(
          `Prize mappings count: ${tournamentPrizeCategoryMappings.length}`
        )

        if (tournamentPrizeCategoryMappings.length) {
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
                    name: p['ccm_tournament_player.name'],
                    mobile_number: p['ccm_tournament_player.mobile'],
                    upi_id: p['ccm_tournament_player.upi_id'],
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
                    name: p['ccm_tournament_player.name'],
                    mobile_number: p['ccm_tournament_player.mobile'],
                    upi_id: p['ccm_tournament_player.upi_id'],
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
          await this.playersPrizePayoutDao.deleteByWhere({
            tournament_id: tournamentId,
          })
          console.log(`Old prize payouts cleared.`)
          if (winningPlayers.length) {
            await this.playersPrizePayoutDao.bulkCreate(winningPlayers)
            console.log(
              `New prize payouts created. Winners count: ${winningPlayers.length}`
            )
          }
        }
      }
    }
  }

  updateScoring = async (round, tournamentId, scores, gameId = '') => {
    try {
      console.log(
        `--- [updateScoring] START | Round: ${round}, Tournament ID: ${tournamentId} ---`
      )
      console.log(
        `GameId: ${gameId}, Scores received:  ${JSON.stringify(scores)}`
      )
      const scoreUploadKey = `ccm_score_upload_${tournamentId}_${round}`
      await this.redisService.setValueWithExpiry(scoreUploadKey, 86400, '1')
      let message = `Updated scores of matches for Round ${round} successfully.`
      const tournament = await this.tournamentDao.findById(tournamentId)
      console.log(
        `Tournament fetched:`,
        tournament?.id,
        `| Current round:`,
        tournament?.current_round
      )
      let promises = []
      if (
        tournament.current_round > Number(round) &&
        tournament.tournament_type !== 'Circlechess_Online'
      ) {
        console.log(
          `Tournament round is ahead of provided round. Will adjust scores for future rounds.`
        )
        promises = Object.keys(scores).map(async (id) => {
          const player = await this.tournamentPairingsDao.findById(id)
          console.log(`Pairing fetched:`, {
            id,
            player_id: player?.player_id,
            result: player?.result,
          })
          const prevResult = processResult(
            player.result,
            !player.parent_id ? 'player' : 'opponent'
          )
          const result = processResult(
            scores[id],
            !player.parent_id ? 'player' : 'opponent'
          )
          const score = result - prevResult
          console.log(
            `Calculated score diff for ID ${id}: PrevResult=${prevResult}, NewResult=${result}, Diff=${score}`
          )
          try {
            await this.tournamentPairingsDao.updateWhere(
              { player_score: sequelize.literal(`player_score + ${score}`) },
              {
                round: { [Op.gt]: round },
                player_id: player.player_id,
              }
            )
            console.log(
              `Updated future pairings player_score for player_id ${player.player_id}`
            )
          } catch (error) {
            console.log('Error updating future scores:', error)
          }
          await this.updatePairingInRedis(tournamentId, round, id, {
            result: scores[id],
            is_scored: true,
          })
          console.log(`Updated pairing in Redis for ID ${id}`)
          // Update the pairing with new score
          return this.tournamentPairingsDao.updateById(
            { result: scores[id], is_scored: true },
            id
          )
        })
        await Promise.allSettled(promises)
        //   message = `Scores of round ${round} can't be updated since it is already completed!`
        //   return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      } else {
        console.log(
          `Tournament round matches provided round. Updating directly.`
        )
        const paringinInQueue = await this.redisService.getValue(
          `ccm_pairing_queue_${tournamentId}_${Number(round) + 1}`
        )
        const pairingKey = `ccm_pairings_order_${tournamentId}_${
          Number(round) + 1
        }`
        const pairingExits = await this.redisService.lLen(pairingKey)
        console.log(
          'Next Round Pairing Check in Queue or Generated',
          paringinInQueue,
          pairingExits,
          `ccm_pairing_queue_${tournamentId}_${Number(round) + 1}`,
          pairingKey
        )
        if (
          tournament.tournament_type !== 'Circlechess_Online' ||
          (tournament.tournament_type === 'Circlechess_Online' &&
            !(paringinInQueue || pairingExits))
        ) {
          const result = await sequelize.query(`
            UPDATE ccm_tournament_pairings AS t
            SET
              result = v.result,
              is_scored = v.is_scored,
              cc_gameid = v.cc_gameid
            FROM (
              VALUES
                ${Object.keys(scores)
                  .map((id) => {
                    return `(${id},'${scores[id]}',true,'${gameId}')`
                  })
                  .join(',')}
            ) AS v(id, result, is_scored, cc_gameid)
            WHERE t.id = v.id;
          `)

          if (!result.length) {
            message = `Updating scores of Round ${round} is failed! Please try again.`
            console.log(message)
            return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
          }
          console.log(`All DB updates settled.`)
          const redisUpdatePromises = Object.keys(scores).map((id) => {
            console.log(`Updating pairing in Redis for ID ${id}`)
            return this.updatePairingInRedis(tournamentId, round, id, {
              result: scores[id],
              is_scored: true,
              cc_gameid: gameId,
            })
          })
          await Promise.allSettled(redisUpdatePromises)
          console.log(`All Redis updates settled.`)
        } else {
          console.log(`Round type of ${typeof round}`)
        }
      }

      // Recalculate standings and prizes after scores update
      this.reCalculateStandingsPrizes(round, tournamentId, tournament.rounds)
      console.log(
        `--- [updateScoring] END | Round ${round} updated successfully ---`
      )

      return responseHandler.returnSuccess(httpStatus.OK, message)
    } catch (e) {
      console.error('[updateScoring] ERROR:', e)
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

  getConfiguration = async (id) => {
    try {
      let message = 'Successfully fetched configuration for tournament.'
      const tnrConfigKey = `ccm_trn_config_${id}`
      const result = await this.redisService.getValue(tnrConfigKey)
      let data = JSON.parse(result)

      if (data) {
        return responseHandler.returnSuccess(httpStatus.OK, message, data)
      }
      // if Data doesn't exist in redis fetch from db
      if (!data) {
        data = await this.tournamentConfigurationDao.findOneByWhere({
          tournament_id: id,
        })
      }

      // Tournament Config not found in both then throw error
      if (!data) {
        message = 'Fetching Tournament configuration failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      await this.redisService.setValueWithExpiry(
        tnrConfigKey,
        86400,
        JSON.stringify(data)
      )
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (error) {
      logger.error(error)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  setConfiguration = async (id, payload) => {
    try {
      let message = 'Successfully updated configuration for tournament.'
      payload.tournament_id = id
      const data = await this.tournamentConfigurationDao.updateOrCreate(
        payload,
        {
          tournament_id: id,
        }
      )
      if (!data) {
        message = 'Tournament configuration update failed! Please Try again.'
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
      const exists = await this.prizeCategoryDao.checkExist(payload?.[0])
      if (exists) {
        message = 'Prize Category already exists! Please create a new one.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const data = await this.prizeCategoryDao.bulkCreate(payload)
      if (!data) {
        message = 'Prize Category Failed! Please try again.'
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

      const players = await this.trnplayersDao.findByWhere({
        tournament_id: tournaments.map((t) => {
          return t.id
        }),
      })

      const yesterdayPlayers = players.filter((p) => {
        return moment().diff(p.createdAt, 'd') === 1
      })?.length

      const todayPlayers = players.filter((p) => {
        return moment(p.createdAt).diff(moment(), 'd') === 0
      })?.length

      const revenue = tournaments.reduce((t, ta) => {
        const total = players.reduce((a, b) => {
          if (b.tournament_id === ta.id) {
            if (Array.isArray(ta.entry_fee)) {
              a += ta.entry_fee.reduce((ac, c) => {
                ac += Number(c.fee)
                return ac
              }, 0)
            } else {
              a += Number(ta.entry_fee[b.entry_fee_category]) || 0
            }
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
        const key = uuidv4()
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
              tournament_key: tournament.feedback_key || key,
              flow_id: 2,
              field_type: fieldsOfType1.includes(f.field) ? 1 : 2,
              is_mandatory: f?.is_mandatory ? f.is_mandatory : 0,
              validator_regex: f.validator_regex,
              pincode_regex: f.pincode_regex,
              answer_options: f.answer_options,
            })
          }
        })
        if (newData.length) {
          if (!tournament?.feedback_key) {
            tournamentBody.feedback_key = key
          }
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
          const fileExtension = path.extname(f.originalname)
          if (f.path.includes('brochure')) {
            const key = tournament.cct_id
              ? `brochures/${tournament.cct_id}${fileExtension}`
              : `brochures/ccm_${id}${fileExtension}`
            tournamentBody.brochure = await s3Helper.uploadFilesToS3(f, key)
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
              tournamentBody.display_pic = await s3Helper.uploadFilesToS3(
                f,
                `images/ccm_${id}${fileExtension}`
              )
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
            let brochure = tournament?.brochure
            if (tournament?.brochure?.length > 0) {
              const oldKey = `brochures/${
                tournament.brochure.split('/').slice(-1)[0]
              }`
              const fileExtension = path.extname(oldKey)
              const newKey = `brochures/${response.id}${fileExtension}`
              await s3Helper.renameFile(oldKey, newKey)
              brochure = brochure?.replace(oldKey, newKey)
            }
            await this.tournamentDao.updateById(
              {
                cct_id: response.id,
                feedback_key: response.tournament_key,
                brochure,
              },
              id
            )
            if (tournament.whatsapp_group_link) {
              await sequelize.query(
                'INSERT INTO cc_event_details (event_name, event_id,whatsapp_group) VALUES (?, ?, ?)',
                {
                  replacements: [
                    tournament.name,
                    response.id,
                    tournament.whatsapp_group_link,
                  ],
                  type: sequelize.QueryTypes.INSERT,
                }
              )
            }
          }
        } catch (error) {
          logger.error(error)
          if (tournamentBody.enable_registration) {
            await this.tournamentDao.updateById(
              { enable_registration: !body.enable_registration },
              id
            )
          }
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
