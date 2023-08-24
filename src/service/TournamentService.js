const httpStatus = require('http-status')
const { Op } = require('sequelize')
const moment = require('moment')
const TournamentDao = require('../dao/TournamentDao')
const PlayersDao = require('../dao/PlayersDao')
const TournamentPairingsDao = require('../dao/TournamentPairingDao')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const { userRoles } = require('../config/constant')
const {
  swissFirstRoundPairing,
  swissOtherRoundPairings,
} = require('../helper/swiss')
const calculateTB1TB2TB3 = require('../helper/tieBreakerCalculation')
const UserService = require('./UserService')
const PrizeCategoryDao = require('../dao/PrizeCategoryDao')
const TournamentPrizeCategoryMappingDao = require('../dao/TournamentCategoryMappingDao')

class TournamentService {
  constructor() {
    this.tournamentDao = new TournamentDao()
    this.prizeCategoryDao = new PrizeCategoryDao()
    this.tournamentPrizeMappingDao = new TournamentPrizeCategoryMappingDao()
    this.playersDao = new PlayersDao()
    this.tournamentPairingsDao = new TournamentPairingsDao()
    this.userService = new UserService()  // This is specifically to for querying the lichess token information from DB
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
        let lichess_username = req.user.lic_name;
        if (lichess_username) {
          let lichessUser = await this.userService.getLichessUserById(lichess_username);
          if (lichessUser && lichessUser.lichess_token) {
            // the user has lichess account integrated
            // TODO: Here we should put an additional logic to validate the token
            lichess_bearer_token = lichess_bearer_token + lichessUser.lichess_token
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

        let lichessRequestBody = {
          "name": tournamentBody.name,
          "clock.limit": tournamentBody.initial_time,
          "clock.increment": tournamentBody.increment_time,
          "nbRounds": tournamentBody.rounds,
          "startsAt": tournamentBody.startDate,
          "variant": "standard",
          "rated": tournamentBody.rated,
          "berserkable": false,     // Should this be true
          "streakable": false,      // Should this be true
          "hasChat": true,
          "description": tournamentBody.description
          // password: Should we have the tournament password here?
        };

        let name_len = tournamentBody.name?.length

        if (name_len && name_len > 30) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name cannot exceed 30 characters'
          )
        }

        console.log('Lichess authorization token being used: ', lichess_bearer_token)
        console.log('Lichess Request body = ', lichessRequestBody)
        // Options to be given as parameter 
        // in fetch for making requests
        // other then GET
        let options = {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
            // The authorization token has to be picked from the DB
            'Authorization': lichess_bearer_token,
            'Accept': 'application/json'
          },
          body: new URLSearchParams(lichessRequestBody)
        }

        let lichessUrl = '';

        try {
          const lichessResponse = await fetch('https://lichess.org/api/swiss/new/circlechess', options)
          console.log('Lichess Response Headers = ', lichessResponse)
          console.log(lichessResponse.body);
          const json = await lichessResponse.json();
          console.log(json)
          if (!json.id) {
            console.log('Lichess tournament creation failed .. tournament id undefined')
            console.log('Json.global.length = ', json.global.length, ' ', json.global)
            console.log('Json Error Global Length = ', json.error.global.length, ' ', json.error.global)
            if (json.global && json.global.length > 0)
              responseHandler.returnError(httpStatus.BAD_REQUEST, json.global[0])
            else if (json.error && json.error.global && json.error.global.length > 0)
              responseHandler.returnError(httpStatus.BAD_REQUEST, json.error.global[0])
          }
          lichessUrl = "https://lichess.org/swiss/" + json.id
        } catch (e) {
          console.log('Lichess tournament creation failed', e)
          message = 'Tournament creation failed! Please Try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        // Set up defaults for tournament row in the DB
        tournamentBody.federation = 'Online Lichess'
        tournamentBody.director = tournamentBody.organizer
        tournamentBody.time_control = tournamentBody.initial_time + '+' + tournamentBody.increment_time
        tournamentBody.start_date = tournamentBody.startDate
        tournamentBody.end_date = tournamentBody.startDate
        tournamentBody.tournament_type = 'Swiss'
        tournamentBody.address = lichessUrl ? lichessUrl : 'Online Lichess'
        tournamentBody.state = 'Online Lichess'
        tournamentBody.country = 'Online Lichess'
        tournamentBody.federation = 'Online Lichess'
        tournamentBody.address = lichessUrl

        const data = await this.tournamentDao.create(tournamentBody)
        console.log(data)
        return responseHandler.returnSuccess(
          httpStatus.CREATED, message, { lichess_tournament_url: lichessUrl, tournament_id: data.id }
        )
      } catch (e) {
        logger.error(e)
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          'Something went wrong!'
        )
      }
    } catch (e) {
      console.log('Error creating lichess tournament ..');
      console.log(e);
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

      console.log('Starting Arena creation ..');

      try {
        let message = 'Successfully created tournament.'
        if (req.user.role !== userRoles.ORGANIZER) {
          message =
            'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        tournamentBody.created_by = req.user.id
        tournamentBody.is_active = true

        let lichessRequestBody = {
          name: tournamentBody.name,
          clockTime: tournamentBody.initial_time,
          clockIncrement: tournamentBody.increment_time,
          minutes: tournamentBody.duration,
          startDate: tournamentBody.startDate,
          variant: "standard",
          rated: tournamentBody.rated,
          berserkable: false,     // Should this be true
          streakable: false,      // Should this be true
          hasChat: true,
          description: tournamentBody.description
          // password: Should we have the tournament password here?
        };

        let name_len = tournamentBody.name?.length

        if (name_len && name_len > 30) {
          console.log('Cannot exceed 30 characters');
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Name cannot exceed 30 characters'
          )
        }

        // validate lichess restrictions
        let tournamentOKRatio = (lichessRequestBody.minutes * 60) /
          (96 * lichessRequestBody.clockTime + 48 * lichessRequestBody.clockIncrement + 15)
        console.log('Cannot violate tournament timing ratio ', tournamentOKRatio);

        if (tournamentOKRatio < 3 || tournamentOKRatio > 150) {
          return responseHandler.returnError(
            httpStatus.BAD_REQUEST,
            'Lichess tournament time ratio check failed'
          )
        }

        // Options to be given as parameter 
        // in fetch for making requests
        // other then GET
        let options = {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
            // The authorization token has to be picked from the DB
            'Authorization':
              'Bearer lio_oTnnA1AE1Kd9xkS3aEwqoG10b2Podg58',
            'Accept': 'application/json'
          },
          body: new URLSearchParams(lichessRequestBody)
        }

        let lichessResponse = '';
        let lichessUrl = '';
        try {
          lichessResponse = await fetch('https://lichess.org/api/tournament', options)

          let json = await lichessResponse.json()
          console.log(json)

          if (!json.id) {
            console.log('Lichess tournament creation failed .. tournament id undefined')
            console.log('Json.global.length = ', json.global.length, ' ', json.global)
            console.log('Json Error Global Length = ', json.error.global.length, ' ', json.error.global)
            if (json.global && json.global.length > 0)
              responseHandler.returnError(httpStatus.BAD_REQUEST, json.global[0])
            else if (json.error && json.error.global && json.error.global.length > 0)
              responseHandler.returnError(httpStatus.BAD_REQUEST, json.error.global[0])
          }

          // Set up defaults for tournament row in the DB
          tournamentBody.federation = 'Online Lichess'
          tournamentBody.director = tournamentBody.organizer
          tournamentBody.time_control = lichessRequestBody.clockTime + '+' + lichessRequestBody.clockIncrement
          tournamentBody.start_date = lichessRequestBody.startDate
          tournamentBody.end_date = lichessRequestBody.startDate
          tournamentBody.tournament_type = 'Arena'
          lichessUrl = "https://lichess.org/tournament/" + json.id
          tournamentBody.address = lichessUrl
          tournamentBody.state = 'Online Lichess'
          tournamentBody.country = 'Online Lichess'
        } catch (e) {
          console.log('Lichess tournament creation failed', e)
          message = 'Tournament creation failed! Please Try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }

        const data = await this.tournamentDao.create(tournamentBody)
        console.log(data)
        return responseHandler.returnSuccess(
          httpStatus.CREATED, message, { lichess_tournament_url: lichessUrl, tournament_id: data.id }
        )
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
    if ('Swiss' === tournament_type) {
      console.log('Creating Swiss tournament')
      return this.createLichessSwissTournament(tournamentBody, req)
    }
    else {
      console.log('Creating Arena tournament')
      return this.createLichessArenaTournament(tournamentBody, req)
    }
  }

  /**
   * Create a user
   * @param {Object} tournamentBody
   * @returns {Object}
   */
  createTournament = async (tournamentBody, req) => {
    try {
      let message = 'Successfully created tournament.'
      if (req.user.role !== userRoles.ORGANIZER) {
        message =
          'Tournament creation is limited to organizers. Kindly sign up or log in as an organizer to continue.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
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

      let data = await this.tournamentDao.create(tournamentBody)

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
      let message = 'Fetched tournaments successfully.'
      let data = await this.tournamentDao.findByWhere(
        { is_active: true /* end_date: { [Op.gte]: moment() } */ },
        undefined,
        ['end_date', 'asc'],
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
      let data = await this.tournamentDao.findOneWithUser(id, [
        'id',
        'email',
        'phone_number',
      ])

      if (!data) {
        message = "Tournament doesn't exists!"
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const roundDetails = await this.tournamentPairingsDao.findDistinct(
        'round',
        { tournament_id: id }
      )
      const scored = await this.tournamentPairingsDao.findCountByGroup(
        'round',
        'result',
        {
          tournament_id: id,
          result: { [Op.gt]: 0 },
        }
      )

      const pairings = [...Array(data.rounds).keys()].reduce((acc, curr) => {
        acc[curr + 1] = {
          paired: roundDetails.map((r) => r.round).includes(curr + 1),
          scored: scored.some((s) => s.round === curr + 1),
        }
        return acc
      }, {})

      let currentRound = roundDetails.map((r) => r.round).pop() || 1

      console.log('currentRound', currentRound, scored)

      if (scored.some((s) => s.round === currentRound)) {
        currentRound += 1
      }

      data.setDataValue('pairings', pairings)
      data.setDataValue('currentRound', currentRound)

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
  getTournamentsByUser = async (userId) => {
    try {
      let message = 'Fetched tournaments successfully.'
      let data = await this.tournamentDao.findByWhere(
        {
          is_active: true,
          created_by: userId,
          // start_date: { [Op.gte]: moment() },
        },
        undefined,
        ['end_date', 'asc']
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

  getNumberWithOrdinal = (n) => {
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
      let message = `Paired successfully for the ${this.getNumberWithOrdinal(
        round
      )} round of the tournament.`

      const tournament = await this.tournamentDao.findById(tournamentId)

      if (!tournament.player_fide_ids) {
        message =
          'The pairing process cannot be initiated as there are no players available for matching. Please upload player information first.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let data = []
      if (round === 1) {
        const players = await this.playersDao.findByWhere({
          fide_id: tournament.player_fide_ids.split(','),
          is_active: true,
        })
        const { whitePlayers, blackPlayers } = swissFirstRoundPairing(
          players,
          tournamentId
        )
        data = whitePlayers.map((w, i) => [w, blackPlayers[i]])
        const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
        if (!res) {
          message = 'Failed to pair players! Please try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        const opponents = blackPlayers.map((b, i) => ({
          ...b,
          parent_id: res[i].id,
        }))
        await this.tournamentPairingsDao.bulkCreate(opponents)
      } else {
        let pairing = await this.tournamentPairingsDao.findByWhere({
          round: round - 1,
        })
        const players = pairing
          .filter((p) => !p.parent_id)
          .map((e) => ({
            ...e,
            player_score: Number(e.player_score) + Number(e.result),
          }))
        const opponents = pairing
          .filter((p) => p.parent_id)
          .map((e) => ({
            ...e,
            player_score: Number(e.player_score) + Number(e.result),
          }))

        const { whitePlayers, blackPlayers } = swissOtherRoundPairings(
          players,
          opponents,
          round,
          tournamentId
        )

        data = whitePlayers.map((w, i) => [w, blackPlayers[i]])
        const res = await this.tournamentPairingsDao.bulkCreate(whitePlayers)
        if (!res) {
          message = 'Failed to pair players! Please try again.'
          return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
        }
        const newOpponents = blackPlayers.map((b, i) => ({
          ...b,
          parent_id: res[i].id,
        }))
        await this.tournamentPairingsDao.bulkCreate(newOpponents)
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
   * Get Tournament Pairing for particular Round
   * @param {Number} round
   * @param {Number} tournamentId
   * @returns {Array}
   */
  getPairings = async (round, tournamentId) => {
    try {
      let message = 'Fetched tournament player pairings successfully.'
      let data = await this.tournamentPairingsDao.findByWhere({
        round: round,
        tournament_id: tournamentId,
      })
      if (!data.length) {
        message = `Pairing of Round ${round} is not done yet! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }
      const players = data
        .filter((p) => !p.parent_id)
        .map((e) => ({
          player: e,
          opponent: data.find((d) => d.parent_id === e.id),
        }))
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
        round: round,
      })

      if (!exists) {
        message = `Round ${round - 1
          } is still going on! Please try after round ${round - 1} is ended.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      let data = await this.tournamentPairingsDao.findByWhere({
        round: { [Op.lte]: round },
        tournament_id: tournamentId,
      })
      if (!data.length) {
        message = `No players found for Round ${round}! Please try again.`
        return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
      }

      const playersMapping = data.reduce((p, c) => {
        const opponent = {
          id: c.id,
          player_fide_id: c.player_fide_id,
          scores: data
            .filter((d) => d.player_fide_id === c.player_fide_id)
            .map((o) => ({
              round: o.round,
              score: o.player_score,
              result: o.result,
            })),
        }
        if (c.parent_id) {
          const player = data.find(
            (d) => d.id === c.parent_id && d.round === c.round
          )
          p[player.player_fide_id] = p[player.player_fide_id]
            ? [...p[player.player_fide_id], opponent]
            : [opponent]
        } else {
          const player = data.find(
            (d) => d.parent_id === c.id && d.round === c.round
          )
          if (player) {
            p[player.player_fide_id] = p[player.player_fide_id]
              ? [...p[player.player_fide_id], opponent]
              : [opponent]
          } else {
            p[c.player_fide_id] = p[c.player_fide_id]
              ? [...p[c.player_fide_id], null]
              : [null]
          }
        }
        return p
      }, {})

      const tieBreakerResult = calculateTB1TB2TB3(playersMapping)
      const players = data
        .filter((d) => d.round === round)
        .map((e) => ({
          ...e,
          ...tieBreakerResult[e.player_fide_id],
          tieSum: Object.values(tieBreakerResult[e.player_fide_id]).reduce(
            (a, b) => a + b,
            0
          ),
          point: Number(e.player_score) + Number(e.result),
        }))
        .sort(
          (a, b) =>
            b.point - a.point ||
            b.tieSum - a.tieSum ||
            b.player_rating - a.player_rating
        )

      return responseHandler.returnSuccess(httpStatus.OK, message, players)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  updateScoring = async (round, scores) => {
    try {
      let message = `Updated scores of matches for Round ${round} successfully.`

      const promises = scores.map(
        async (s) =>
          await this.tournamentPairingsDao.updateById({ result: s.score }, s.id)
      )
      const result = await Promise.all(promises)
      if (!result.length) {
        message = `Updating scores of Round ${round} is failed! Please try again.`
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

  recommendPrizeStructure = async (id) => {
    const tournament = this.tournamentDao.findOneByWhere({ id })
    const inflow = tournament.registration_inflow
    console.log(inflow)

    // Assuming this is returning back categories 
    // in order of number of participants
    const sort = (categories) => {
      return categories
    }

    const categories = this.prizeCategoryDao.findAll({ tournament_id: id })
    categories = sort(categories)
  }

  /**
   * @param id: Tournament ID
   * @returns Returns all static prize categories with their prize recommendations.
   * These are merged with any prize categories already allocated to the tournament.
   */
  getStaticPrizeCategories = async (id) => {
    try {
      let message = 'Successfully retrieve all prize categories'
      const prizeCats = await this.prizeCategoryDao.findAllRaw({})
      const tournamentPrizeCategoryMappings = await this.tournamentPrizeMappingDao.findAllRaw({ tournament_id: id })

      for (let catIdx in prizeCats) {
        for (let mappingIdx in tournamentPrizeCategoryMappings) {
          if (tournamentPrizeCategoryMappings[mappingIdx].category_id == prizeCats[catIdx].id) {
            prizeCats[catIdx] = {
              ...prizeCats[catIdx],
              prize1Value: tournamentPrizeCategoryMappings[mappingIdx].prize1,
              prize2Value: tournamentPrizeCategoryMappings[mappingIdx].prize2,
              prize3Value: tournamentPrizeCategoryMappings[mappingIdx].prize3,
            }
          }
        }
      }

      return responseHandler.returnSuccess(httpStatus.OK, message, prizeCats)
    } catch (error) {
      const message = 'Could not retrieve prize categories'
      console.log(error)
      return responseHandler.returnError(httpStatus.BAD_REQUEST, message)
    }
  }

  updatePrizingCategories = async (prizeStructure, req) => {
    try {
      let success_msg = 'Prize structure creation successful'
      let error_msg = 'Tournament Prize Category updation failed ..'
      const { tournament_id, categories } = prizeStructure

      let obj = {
        tournament_id,
      }

      console.log('Prize Structure: ', prizeStructure)

      // Let us clean up current prize categories first
      try {
        await this.tournamentPrizeMappingDao.deleteByWhere({ tournament_id })
        console.log('Cleaned up current prize categories ..')
      } catch (error) {
        console.log('Unable to delete current prize categories', error)
        message = 'Prize Category creation failed! Current category clean up failed. Please Try again.'
        return responseHandler.returnError(httpStatus.BAD_REQUEST, error_msg)
      }

      delete prizeStructure['tournament_id']

      let bulkCreateObjects = {}

      let catMap = new Map()

      for (let key in prizeStructure) {
        if (key.startsWith('id_')) continue
        let keys = key.split("_")
        let prizeCatId = keys[2]

        console.log('prizeCatId Key = ', prizeCatId)

        let inputs = []
        if (!catMap.get(prizeCatId)) {
          catMap.set(prizeCatId, inputs)
        } else {
          inputs = catMap.get(prizeCatId)
        }

        inputs.push(key)
      }

      console.log(catMap)

      catMap.forEach(async (values, catId) => {
        console.log('Category: ', catId)
        console.log('Values: ', values)
        for (let index in values) {
          let key = values[index]
          let keys = key.split("_")
          let prizeCatId = keys[2]
          let prizeIndex = keys[3]
  
          obj = {
            ...obj,
            category_id: parseInt(catId),
          }
  
          console.log('prizeIndex = ', prizeIndex)
          console.log('key = ', key)
  
          switch (prizeIndex) {
            case '1': obj.prize1 = parseInt(prizeStructure[key])
              console.log('Assigning to prize 1 ', parseInt(prizeStructure[key]))
              break;
            case '2': obj.prize2 = parseInt(prizeStructure[key])
            console.log('Assigning to prize 2 ', parseInt(prizeStructure[key]))
            break;
            case '3': obj.prize3 = parseInt(prizeStructure[key])
            console.log('Assigning to prize 3 ', parseInt(prizeStructure[key]))
            break;
            default: console.log('Prize Index = ', prizeIndex)
          }
        }

        try {
          console.log(obj)
          await this.tournamentPrizeMappingDao.create(obj)
        } catch (e) {
          console.log('Failed to insert into DB ', e)
          return responseHandler.returnError(httpStatus.BAD_REQUEST, error_msg)
        }
      })


      return responseHandler.returnSuccess(httpStatus.CREATED, success_msg, {})
    } catch (error) {
      console.log(error)
      message = 'Prize Category creation failed! Please Try again.'
      return responseHandler.returnError(httpStatus.BAD_REQUEST, error_msg)
    }
  }
}

module.exports = TournamentService
