/* eslint-disable no-await-in-loop */
const { parentPort, workerData } = require('worker_threads')
const TournamentDao = require('../src/dao/TournamentDao')
const TournamentConfigurationDao = require('../src/dao/TournamentConfigurationDao')
const config = require('../src/config/config')

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
      address: `https://pp-learn.circlechess.com/playChess?tournamentId=${groupTournamentId}&tournamentName=${tournamentName?.replace(
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

  const responses = []

  await groupPlayers.reduce((promiseChain, player) => {
    return promiseChain.then(async () => {
      const joinBody = {
        requestId: `${player.cc_userid}-${groupTournamentId}-${Date.now()}`,
        type: 'JOIN_TOURNAMENT_REQUEST',
        playerId: String(player.cc_userid),
        tournamentId: String(groupTournamentId),
      }

      try {
        const res = await fetch(
          `${config.gameService.endpoint}/joinTournament`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': config.XapiKey,
            },
            body: JSON.stringify(joinBody),
          }
        )

        responses.push(res)
      } catch (err) {
        responses.push({
          error: true,
          playerId: player.cc_userid,
          message: err.message,
        })
      }

      await sleep(20) // Enforces 20ms delay between each request
    })
  }, Promise.resolve())

  // 4. Join all players to the new tournament in parallel
  //   const joinPromises = groupPlayers.map(async (player) => {
  //     const joinBody = {
  //       requestId: `${player.cc_userid}-${groupTournamentId}-${Date.now()}`,
  //       type: 'JOIN_TOURNAMENT_REQUEST',
  //       playerId: String(player.cc_userid),
  //       tournamentId: String(groupTournamentId),
  //     }
  //     await sleep(20)
  //     return fetch(`${config.gameService.endpoint}/joinTournament`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'x-api-key': config.XapiKey,
  //       },
  //       body: JSON.stringify(joinBody),
  //     }).catch((err) => {
  //       return {
  //         // Prevent one failed request from crashing Promise.all
  //         error: true,
  //         playerId: player.cc_userid,
  //         message: err.message,
  //       }
  //     })
  //   })

  await Promise.allSettled(responses)

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
