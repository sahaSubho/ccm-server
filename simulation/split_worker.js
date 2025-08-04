/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
const { parentPort, workerData } = require('worker_threads')
const { join } = require('path')
const TournamentDao = require('../src/dao/TournamentDao')
const TournamentConfigurationDao = require('../src/dao/TournamentConfigurationDao')
const config = require('../src/config/config')

async function joinTournament(joinBody, responses) {
  try {
    const res = await fetch(`${config.gameService.endpoint}/joinTournament`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.XapiKey,
      },
      body: JSON.stringify(joinBody),
    })

    responses.push(res)
  } catch (err) {
    responses.push({
      error: true,
      message: err.message,
      body: joinBody,
    })
  }
}

// This function processes a single group of players
async function processGroup({
  groupPlayers,
  originalTournamentId,
  tournamentPrefix,
  groupIndex,
}) {
  const tournamentDao = new TournamentDao()
  const tnrConfig = new TournamentConfigurationDao()

  // 1. Create the new group tournament in the database
  const tournament = await tournamentDao.findById(originalTournamentId)
  delete tournament.id
  const tournamentName = `${tournamentPrefix} - Group ${groupIndex + 1}`
  const groupTournament = await tournamentDao.create({
    ...tournament,
    name: tournamentName,
    enable_registration: false,
    parent_id: originalTournamentId,
  })

  const groupTournamentId = groupTournament.id
  if (!groupTournamentId) {
    throw new Error(`Failed to create tournament for Group ${groupIndex + 1}`)
  }

  // 2. Update tournament details and create configuration
  await tournamentDao.updateById(
    {
      address: `https://${
        process.env.ENV === 'preprod' ? 'pp-' : ''
      }learn.circlechess.com/playChess?tournamentId=${groupTournamentId}&tournamentName=${tournamentName?.replace(
        /\s/g,
        '-'
      )}`,
      enable_registration: true,
      is_active: true,
    },
    groupTournamentId
  )

  await tnrConfig.create({
    tournament_id: groupTournamentId,
    tiebreaks: ['BH-C1', 'BH', 'SB'],
    tiebreak_settings: {
      BH: { games: { best: '1', worst: '0' } },
      SB: { games: { best: '1', worst: '0' } },
      'BH-C1': { games: { best: '1', worst: '0' } },
    },
    sorting: true,
    engine: 'javafo',
  })

  // 3. Create the tournament on the game service
  await fetch(`${config.gameService.endpoint}/createTournament`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.XapiKey,
    },
    body: JSON.stringify({ tournamentData: groupTournament }),
  })

  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  let attempts = 0
  let responses = []

  await groupPlayers.reduce((promiseChain, player) => {
    return promiseChain.then(async () => {
      const joinBody = {
        requestId: `${player.cc_userid}-${groupTournamentId}-${Date.now()}`,
        type: 'JOIN_TOURNAMENT_REQUEST',
        playerId: String(player.cc_userid),
        tournamentId: String(groupTournamentId),
      }
      await joinTournament(joinBody, responses)

      await sleep(20) // Enforces 20ms delay between each request
    })
  }, Promise.resolve())

  //   await Promise.allSettled(responses)
  while (
    attempts < 2 &&
    responses.some((res) => {
      return res.error
    })
  ) {
    attempts += 1
    await sleep(1000) // Wait for 1 second before retrying
    const failedJoinPlayers = responses.filter((res) => {
      return res.error
    })
    console.log(
      `Retrying failed join requests for player ids :${failedJoinPlayers
        .map((p) => {
          return p?.body?.playerId
        })
        .join(',')}, attempt ${attempts}`
    )
    responses = responses.filter((res) => {
      return !res.error
    })

    if (failedJoinPlayers.length > 0) {
      const promises = failedJoinPlayers.map((p) => {
        return joinTournament(p.body, responses)
      })
      await Promise.allSettled(promises)
    }
  }

  return {
    status: '✅ Success',
    group: groupIndex + 1,
    tournamentId: groupTournamentId,
    playerCount: groupPlayers.length,
  }
}

// Listen for a message from the main thread and start processing
parentPort.on('message', async (data) => {
  try {
    const result = await processGroup(data)
    parentPort.postMessage({ type: 'done', result })
  } catch (error) {
    parentPort.postMessage({
      type: 'error',
      error: {
        message: error.message,
        stack: error.stack,
        groupIndex: data.groupIndex,
      },
    })
  }
})
