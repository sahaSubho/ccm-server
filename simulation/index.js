const endpoint = 'http://localhost:5001/api'
const fetch = require('node-fetch')
const logger = require('../src/config/logger')

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
      return '0-0'
      break
  }
}

const getUserToken = async () => {
  const url = `${endpoint}/auth/login`
  const body = {
    email: 'abc@gmail.com',
    password: 'abc@12',
  }
  const response = await fetch(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await response.json()
  options['headers']['Authorization'] = `Bearer ${data.tokens.access.token}`
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
  const url = `${endpoint}/tournament/get-tournament-list?limit=1000`
  const response = await fetch(url, options)
  const data = await response.json()
  const tournaments = data.data.rows.filter(t => t.id ===834)
  for (const tournament of tournaments) {
    try {
      logger.info(`Starting tournament ${tournament.id}`)
      await createTournamentConfig(tournament.id)
      const players = await getTournamentPlayers(tournament.id)
      if (!players) {
        logger.error(`No players found for tournament ${tournament.id}`)
      } else {
        const rounds = tournament.rounds
        if(rounds === tournament.current_round) {
          logger.info(`Tournament ${tournament.id} already completed`)
          continue
        }else{
        for (let round = 1; round <= rounds; round++) {
          const pairings = await generatePairings(round, tournament.id)
          if (pairings) {
            await scoreUpload(pairings, tournament.id, round)
          }
          // console.log("pairings", pairings)
        }
    }
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
}

// const response = await fetch(url, options)
// const juspayResponse = await response.json()

sitmulateAllTournamentFlows()
