const endpoint = 'http://localhost:5000/api'
const fetch = require('node-fetch')
const logger = require('../src/config/logger')
const { sequelize } = require('../src/models')


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


const axios = require('axios');

const webhookURL = 'https://hooks.slack.com/services/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'

const sendSlackMessage = async (message) => {
  try {
    const response = await axios.post(webhookURL, {
      text: message, // Plain text
    });
    console.log('Message sent: ', response.data);
  } catch (error) {
    console.error('Error sending message: ', error);
  }
};

const options = {
  headers: {
    'api-key': '2d30f638-8922-4d8a-bb77-e25ad4af0aed',
    'Content-Type': 'application/json',
  },
}

const getScores = (key) => {
  switch (key) {
    case 1:
      return '1-0'
    case 2:
      return '0.5-0.5'
    case 3:
      return '0-1'
    case 4:
      return '+--'
    case 5:
      return '--+'
    case 6:
      return '---'
    case 7:
      return '0.5-0'
    case 8:
      return '0-0'
    case 9:
      return '0-0.5'
    case 10:
      return '0.5-1'
    case 11:
      return '1-0.5'
    case 12:
      return '1-1'
    default:
      return '1-0'
  }
}

const getUserToken = async () => {
  try {
    const url = `${endpoint}/auth/login`
    const body = {
      email: 'kr.gaurav@gmail.com',
      password: 'dost1234',
    }
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
    const data = await response.json()
    options['headers']['Authorization'] = `Bearer ${data.tokens.access.token}`
  } catch (error) {
    console.log('GET User Token error:', error)
  }
}

const getTournamentPlayers = async (tournamentId) => {
  const url = `${endpoint}/players/${tournamentId}`
  const response = await fetch(url, options)
  const data = await response.json()
  return data.data
}

const createTournamentConfig = async (tournamentId) => {
  const url = `${endpoint}/tournament/config/${tournamentId}`
  const body = {
    tiebreaks: ['BH-C1', 'BH', 'SB'],
    tiebreak_settings: {
      BH: {
        games: {
          best: '1',
          worst: '0',
        },
      },
      SB: {
        games: {
          best: '1',
          worst: '0',
        },
      },
      'BH-C1': {
        games: {
          best: '1',
          worst: '0',
        },
      },
    },
    sorting: true,
    sorting_type: 'nat',
    pairings: '1,1/2,0',
    color: 'random',
    bye_point: '1.00',
  }
  const response = await fetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await response.json()
}

const disbleTournamentReg = async (tournamentId) => {
  const url = `${endpoint}/tournament/${tournamentId}`
  const response = await fetch(url, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify({ enable_registration: false }),
  })
  const data = await response.json()
  console.log('tournament config', data)
}

const generatePairings = async (round, tournamentId) => {
  try {
    const url = `${endpoint}/tournament/generate-pairing?round=${round}&tournamentId=${tournamentId}`
    const response = await fetch(url, options)
    const data = await response.json()
    if (data.status) {
      logger.info(
        `Pairings for round ${round} and tournament ${tournamentId} generated successfully`
      )
      return data.data
    } else {
      logger.error(
        `Pairings for round ${round} and tournament ${tournamentId} generation failed: ${data.message}`
      )
      return null
    }
  } catch (error) {
    logger.error(
      `Error generating pairings for round ${round} and tournament ${tournamentId}: ${error.message}`
    )
    return null
  }
}

const generateTestPairings = async (round, tournamentId) => {
  try {

  await getUserToken()
    const url = `${endpoint}/tournament/generate-test-pairing?round=${round}&tournamentId=${tournamentId}`
    const response = await fetch(url, options)
    const data = await response.json()

    if (data.status) {
      logger.info(
        `Pairings for round ${round} and tournament ${tournamentId} generated successfully`
      )
      return data
    } else {
      logger.error(
        `Pairings for round ${round} and tournament ${tournamentId} generation failed: ${data.message}`
      )
      return null
    }
  } catch (error) {
    logger.error(
      `Error generating pairings for round ${round} and tournament ${tournamentId}: ${error.message}`
    )
    return null
  }
}

const scoreUpload = async (pairings, tournamentId, round) => {
  const scorePayload = pairings.reduce((acc, element) => {
    const randomNumber = Math.floor(Math.random() * 12) + 1
    const score = getScores(randomNumber)
    if (element?.player && !element?.opponent) {
      acc[element.player.id] = '+-'
    } else if (!element?.player && element?.opponent) {
      acc[element.opponent.id] = '+-'
    } else if (element?.player && element?.opponent) {
      acc[element.player.id] = score
      acc[element.opponent.id] = score
    }
    return acc
  }, {})
  const url = `${endpoint}/tournament/score-upload?round=${round}&tournamentId=${tournamentId}`
  const response = await fetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(scorePayload),
  })
  const data = await response.json()
  if (!data.status) {
    logger.error(
      `Score upload failed for round ${round} and tournament ${tournamentId}: ${data.message}`
    )
  } else {
    logger.info(
      `Score upload successful for round ${round} and tournament ${tournamentId}`
    )
  }
}

async function sitmulateAllTournamentFlows() {
  await getUserToken()
  const url = `${endpoint}/tournament/get-tournament-list?limit=500`
  const response = await fetch(url, options)
  const data = await response.json()
  const tournaments = data.data.rows
  for (const tournament of tournaments) {
    try {
      logger.info(`Starting tournament ${tournament.id}`)
      await createTournamentConfig(tournament.id)
      const players = await getTournamentPlayers(tournament.id)
      if (!players) {
        logger.error(`No players found for tournament ${tournament.id}`)
      } else if (players.length > 10 && players.length < 1000) {
        const rounds = tournament.rounds
        const current_round = tournament.current_round
        // if (rounds === tournament.current_round) {
        //   logger.info(`Tournament ${tournament.id} already completed`)
        //   continue
        // } else {
        for (let round = 1; round <= rounds; round++) {
          const pairings = await generatePairings(round, tournament.id)
          if (pairings) {
            await scoreUpload(pairings, tournament.id, round)
          }
          // console.log("pairings", pairings)
        }
        await sequelize.query(
          `update cc_tournament_chessmasters set current_round=${current_round} where id=${tournament.id};`
        )
        // }
      } else {
        logger.info('Players not in required data format')
      }
      logger.info(`Tournament ${tournament.id} completed`)
    } catch (error) {
      logger.error(`Error for tournament ${tournament.id} :${error.message}`)
      continue
    }
    // const url = `${endpoint}/tournament/get-pairings?tournamentId=${tournament._id}`
    // const response = await fetch(url, options)
    // const data = await response.json()
    // console.log("pairings", data)
  }
  await sequelize.query('delete from temp_tournament_pairings;')
}

// const response = await fetch(url, options)
// const juspayResponse = await response.json()
//
//
const getTournamentPairing = async (tournamentId) => {
  const url = `${endpoint}/players/${tournamentId}`
  const response = await fetch(url, options)
  const data = await response.json()
  return data.data
}

const TournamentDao = require('../src/dao/TournamentDao')

const { Op } = require('sequelize')


const validatePairingStatus = async (round, tournamentId, name) => {
     const pairings = await generateTestPairings(round, tournamentId)

     if (pairings.status === true && pairings.code === 200) {
	 const message = `Test pairing for ${name} ( TID: ${tournamentId} ) is successful`;
	 //sendSlackMessage(message)

     } else {
	 const message = `Test pairing for ${name} ( TID: ${tournamentId} ) is failed`;
	 sendSlackMessage(message)
     }
}


const validateAllUpcomingTournamentsPairing = async () => {
	const startOfToday = new Date()
	startOfToday.setHours(0, 0, 0, 0)

	const startOfTomorrow = new Date(startOfToday)
	startOfTomorrow.setDate(startOfToday.getDate() + 1)

	const filter = {
	  start_date: {
	    [Op.gte]: startOfToday,
	    [Op.lt]: startOfTomorrow
	  }
	}
	const util = require('util')
	console.log(util.inspect(filter, { showHidden: false, depth: null, colors: true }))

	console.log('sending filter clause:', JSON.stringify(filter, null, 2))

	const tournamentDao = new TournamentDao()

	const tournaments = await tournamentDao.getAllFilteredTournaments(filter)

        const currentHour = new Date().getHours(); // gets 0–23

        if ([6, 12, 18, 0].includes(currentHour)) {
             const msg = `Running tournament pairing validations for ${tournaments.length} tournaments`;
             sendSlackMessage(msg);
        }

	for (let t of tournaments) {
            console.log('Tournament ID:', t.id, 'Name:', t.name, 'Start:', t.start_date)
            await validatePairingStatus(1, t.id, t.name)
	    await sleep(2000);
	}

};

validateAllUpcomingTournamentsPairing().then(() => {
  console.log('Completed')
  process.exit(0)
})

/*
tc = new TournamentController()
res = tc.createTournamentPairingTest(1, 133)

console.log("1 returned response")
console.log(res)
console.log("2 returned response")
*/

module.exports = sitmulateAllTournamentFlows

