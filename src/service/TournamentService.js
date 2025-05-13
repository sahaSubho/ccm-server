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

  classifyTimeControl = (timeControl) => {
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
      minutes = parseInt(plusFormatMatch[1])
      seconds = parseInt(plusFormatMatch[2])
    } else {
      const matches = timeControl.match(/(\d+)(m|s)?/g)
      if (matches) {
        matches.forEach((part) => {
          if (part.includes('m')) {
            minutes = parseInt(part)
          } else if (part.includes('s')) {
            seconds = parseInt(part)
          } else {
            minutes = parseInt(part)
          }
        })
      }
    }

    const totalTime = minutes + seconds / 60

    // Classify based on total time
    if (totalTime < 3) {
      return 'Bullet'
    } else if (totalTime >= 3 && totalTime < 10) {
      return 'Blitz'
    } else if (totalTime >= 10 && totalTime <= 30) {
      return 'Rapid'
    } else {
      return 'Classical'
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
          tournamentBody.time_format = this.classifyTimeControl(
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
            const defaultConfig = {
              tiebreaks: ['BH-C1', 'BH', 'SB'],
              tiebreak_settings: {
                BH: { games: { best: '1', worst: '0' } },
                SB: { games: { best: '1', worst: '0' } },
                'BH-C1': { games: { best: '1', worst: '0' } },
              },
            }
            const reponse = await this.setConfiguration(data.id, defaultConfig)

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
            } else {
              console.error('Game service returned an error:', jsonResponse)
              return responseHandler.returnError(
                httpStatus.INTERNAL_SERVER_ERROR,
                'Tournament created, but failed to notify game service.'
              )
            }
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
          tournamentBody.time_format = this.classifyTimeControl(
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
            Authorization: 'Bearer ' + lichessUser.lichess_token,
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
          tournamentBody.time_format = this.classifyTimeControl(
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

      if (tournamentBody.is_club_membership === 1) {
        const exits = await this.tournamentDao.checkExist({
          name: tournamentBody.name,
        })
        if (exits) {
          message = 'Club name already exists! Try Different name.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
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

      tournamentBody.time_format = this.classifyTimeControl(
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
          tournament_id: data.map((t) => t.id),
        }
      )

      const playersCountMap = playerCountMap.reduce((acc, curr) => {
        acc[curr.tournament_id] = curr.count
        return acc
      }, {})

      data.forEach((tournament) => {
        const playerCount = playersCountMap[tournament.id] || 0
        tournament['players_count'] = playerCount
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

  getCirclechesssTournaments = async (limit = 10, offset = 0, userId) => {
    try {
      const message = 'Fetched tournaments successfully.'

      const data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
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

      if (data?.length > 0) {
        const [results] = await sequelize.query(`
        SELECT tournament_registration_id, id
        FROM cc_tournaments  
        WHERE id IN (${data.map((t) => t.cct_id || 0).join(',')})
      `)

        const registrationsIdMap = results.reduce((acc, row) => {
          acc[row.id] = row.tournament_registration_id
          return acc
        }, {})

        const [players] = await sequelize.query(`
        SELECT tournament_id, player_id
        FROM cc_registration_orders  
        WHERE tournament_id IN (${data.map((t) => t.cct_id || 0).join(',')})
      `)

        const playersIdMap = players.reduce((acc, row) => {
          acc[row.tournament_id] = row.player_id
          return acc
        }, {})

        if (userId) {
          const user = await this.CCUserDao.findByWhere({ user_id: userId })
          const [clubs] = await sequelize.query(`
            SELECT association_name
            FROM cc_association_registrations  
            WHERE mobile_number='${user.mobile_number}';
          `)
          const club_memberships = clubs.map((c) => c.association_name)
          data.forEach(async (tournament) => {
            tournament['is_registered'] = playersIdMap[tournament.id]
              ? true
              : false
            tournament['is_free'] =
              registrationsIdMap[tournament.cct_id] &&
              (tournament.entry_fee > 0 ||
                (tournament.mandatory_club_membership_name &&
                  !club_memberships.includes(
                    tournament.mandatory_club_membership_name
                  )))
                ? false
                : true
            tournament['registration_tid'] =
              registrationsIdMap[tournament.cct_id] || null
          })
        }
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
      console.log('inside getJoinedTournaments userId:', userId)
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

      console.log(tournamentIds)

      // Fetch tournament details for these tournament IDs
      const tournaments = await this.tournamentDao.findByWhere(
        { id: tournamentIds } // The 'where' condition to match tournament IDs
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
          time_format: this.classifyTimeControl(tournament.time_control),
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

      let fide_ids = []
      if (data.player_fide_ids) {
        fide_ids = data.player_fide_ids.split(',')
      }

      const players = await this.CCUserDao.findByWhere({ user_id: fide_ids })

      let joinedPlayers = []
      if (players.length > 0) {
        joinedPlayers = players.map((player) => {
          return {
            username: player.username,
            rating: player.gameplay_rating,
          }
        })
        data.setDataValue('players_joined', joinedPlayers)
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
      // const scored = await this.tournamentPairingsDao.findSumByGroup(
      //   'round',
      //   'result',
      //   {
      //     tournament_id: id,
      //     result: { [Op.gt]: 0 },
      //   }
      // )
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
          isScored.some((s) => {
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
   * Get Club Membership List created by Organizer
   * @returns {Object}
   */
  getClubMembership = async (user) => {
    try {
      const message = 'Fetched all clubs successfully.'
      const data = await this.tournamentDao.findByWhere({
        created_by: user.id,
        is_club_membership: 1,
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
      if (type && type !== 'all') {
        where.tournament_type = type === 'offline' ? 'OTB' : { [Op.ne]: 'OTB' }
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

        data.rows = data?.rows?.map((x) => ({
          ...x.dataValues,
          player_count: playersCountMap[x.dataValues.id] || 0,
        }))
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
      let players = await this.trnplayersDao.findByWhere({
        tournament_id: tournamentId,
      })

      if (round > tournament.rounds) {
        message = 'Pairing already done for all rounds in the tournament.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (!players.length) {
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

      let white = []
      let black = []
      let ranking = {}
      let lastRoundPairings = []

      if (round > 1) {
        let pairing = await this.tournamentPairingsDao.findByWhere({
          round: { [Op.lt]: round },
          tournament_id: tournamentId,
        })
        const trnConfig = await this.tournamentConfigurationDao.findOneByWhere({
          tournament_id: tournamentId,
        })

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

      const tnrConfig = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: tournamentId,
      })
      if (tnrConfig.sorting) {
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
          return aRank?.rank - bRank?.rank
        })
      }
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
      const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
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

      await this.tournamentDao.updateById(
        { current_round: Number(round), new_player_added: false },
        tournamentId
      )

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
      // const redisResult = await this.redisService.getValue(
      //   `ccm_pairings_${tournamentId}_${round}`
      // )
      // if (redisResult) {
      //   return responseHandler.returnSuccess(
      //     httpStatus.OK,
      //     message,
      //     JSON.parse(redisResult)
      //   )
      // }
      const data = await this.tournamentPairingsDao.findByWhere({
        round,
        tournament_id: tournamentId,
      })
      if (!data.length) {
        message = `Pairing of Round ${round} is not done yet! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const teams = await this.teamsDao.findByWhere({
        tournament_id: tournamentId,
      })
      const players = data
        .filter((p) => {
          return !p.parent_id && !p.is_unpaired
        })
        .map((e) => {
          return {
            player: e.is_unpaired ? undefined : e,
            opponent: data.find((d) => {
              return d.parent_id === e.id
            }),
            unpaired: e.is_unpaired ? e : undefined,
            teamA: teams?.find((t) => {
              return t.player_uuids.includes(e.player_id)
            })?.name,
            teamB: teams?.find((t) => {
              return t.player_uuids.includes(
                data?.find((d) => {
                  return d.parent_id === e.id
                })?.player_id
              )
            })?.name,
          }
        })
        .concat(
          data
            .filter((p) => {
              return p.is_unpaired
            })
            .map((x) => {
              return { unpaired: x }
            })
        )
      // if (teams.length) {
      //   players = TournamentService.convertToTeamPairings(players)
      // }
      // await this.redisService.setValue(
      //   `ccm_pairings_${tournamentId}_${round}`,
      //   JSON.stringify(players)
      // )
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
      }
      if (opponent_id) {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: true, parent_id: null },
          { ...where, id: opponent_id }
        )
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
      let parent_id = player_id
      if (type === 'add') {
        message = 'Successfully added new board pairing'
        const player_data = await this.tournamentPairingsDao.findOneByWhere(
          { id: player_id },
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
        await this.tournamentPairingsDao.deleteByWhere({ id: player_id })
        const new_player = await this.tournamentPairingsDao.create(player_data)
        parent_id = new_player.dataValues.id
      } else {
        await this.tournamentPairingsDao.updateWhere(
          { is_unpaired: false, is_withdrawn: false },
          { ...where, id: player_id }
        )
      }
      await this.tournamentPairingsDao.updateWhere(
        { is_unpaired: false, parent_id },
        { ...where, id: opponent_id }
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
      const teamsData = await this.teamPairingsDao.findByWhere({
        round: { [Op.lte]: round },
        tournament_id: tournamentId,
      })
      const trnConfig = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: tournamentId,
      })
      let result
      if (teamsData.length) {
        result = getTieBreaks(teamsData, round, trnConfig)
      } else {
        const convertedData = convertPlayersResultInNumeric(data, trnConfig)
        result = getTieBreaks(convertedData, round, trnConfig)
      }
      return responseHandler.returnSuccess(httpStatus.OK, message, result)
    } catch (e) {
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
      return responseHandler.returnSuccess(httpStatus.OK, message)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  updateScoring = async (round, tournamentId, scores, gameId = '') => {
    try {
      let message = `Updated scores of matches for Round ${round} successfully.`
      const tournament = await this.tournamentDao.findById(tournamentId)

      let promises
      if (tournament.current_round > round) {
        promises = Object.keys(scores).map(async (id) => {
          const player = await this.tournamentPairingsDao.findById(id)
          const prevResult = processResult(
            player.result,
            !player.parent_id ? 'player' : 'opponent'
          )
          const result = processResult(
            scores[id],
            !player.parent_id ? 'player' : 'opponent'
          )
          const score = result - prevResult
          try {
            await this.tournamentPairingsDao.updateWhere(
              { player_score: sequelize.literal(`player_score + ${score}`) },
              {
                round: { [Op.gt]: round },
                player_id: player.player_id,
              }
            )
          } catch (error) {
            console.log('error', error)
          }
          return this.tournamentPairingsDao.updateById(
            { result: scores[id], is_scored: true },
            id
          )
        })
        //   message = `Scores of round ${round} can't be updated since it is already completed!`
        //   return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      } else {
        promises = Object.keys(scores).map((id) => {
          return this.tournamentPairingsDao.updateById(
            { result: scores[id], is_scored: true, cc_gameid: gameId },
            id
          )
        })
      }

      // const promises = Object.keys(scores).map((id) => {
      //   return this.tournamentPairingsDao.updateById(
      //     { result: scores[id], is_scored: true },
      //     id
      //   )
      // })
      const result = await Promise.allSettled(promises)
      if (!result.length) {
        message = `Updating scores of Round ${round} is failed! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      if (
        tournament.rounds === Number(round) &&
        !tournament.tournament_type === 'Ciclechess_Online'
      ) {
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
          const trnConfig =
            await this.tournamentConfigurationDao.findOneByWhere({
              tournament_id: tournamentId,
            })
          const players = getTieBreaks(data, Number(round), trnConfig)
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

  getConfiguration = async (id) => {
    try {
      let message = 'Successfully fetched configuration for tournament.'
      const data = await this.tournamentConfigurationDao.findOneByWhere({
        tournament_id: id,
      })
      if (!data) {
        message = 'Fetching Tournament configuration failed! Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

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
        tournament_id: tournaments.map((t) => t.id),
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
              a += ta.entry_fee.reduce((ac, b) => {
                ac += Number(b.fee)
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
