const { Worker } = require('worker_threads')
const path = require('path')
const PlayersDao = require('../src/dao/TournamentPlayersDao')
const config = require('../src/config/config')

const playerDao = new PlayersDao()

// ---------------- Fetch Tournament ID from CLI ----------------
const tournamentId = process.argv[2]
const tournamentPrefix = process.argv[3]

if (!tournamentId || !tournamentPrefix) {
  console.error(
    '❌ Please provide a tournament ID and a prefix. Example:\n   node split.js 123 "My Awesome Event"'
  )
  process.exit(1)
}

// ---------------- Fetch Players & Categorize (Functions remain the same) ----------------
async function getPlayersByTournamentId(id) {
  // Unchanged...
  return playerDao.findByWhere({ tournament_id: id }, [
    'name',
    'fide_id',
    'title',
    'cc_userid',
    'age',
    'gender',
    'mobile',
    'rating',
  ])
}

function categorizePlayers(players) {
  // Unchanged...
  const groups = {
    '2000+': [],
    '1800-2000': [],
    '1400-1800': [],
    '<1400': [],
  }
  for (const player of players) {
    if (player.rating >= 2000) {
      groups['2000+'].push(player)
    } else if (player.rating >= 1800) {
      groups['1800-2000'].push(player)
    } else if (player.rating >= 1400) {
      groups['1400-1800'].push(player)
    } else {
      groups['<1400'].push(player)
    }
  }
  return groups
}

function shuffle(array) {
  // Unchanged...
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

function generateRandomRatios() {
  // Unchanged...
  const r1 = Math.floor(Math.random() * 20) + 10
  const r2 = Math.floor(Math.random() * 20) + 20
  const r3 = Math.floor(Math.random() * 30) + 20
  const r4 = 100 - (r1 + r2 + r3)
  return { '2000+': r1, '1800-2000': r2, '1400-1800': r3, '<1400': r4 }
}

function allocateGroup(ratingPools, groupSize = 1000) {
  // Unchanged...
  const ratios = generateRandomRatios()
  const group = []
  for (const [key, percentage] of Object.entries(ratios)) {
    const count = Math.min(
      Math.floor((percentage / 100) * groupSize),
      ratingPools[key].length
    )
    group.push(...ratingPools[key].splice(0, count))
  }
  while (group.length < groupSize) {
    const available = Object.keys(ratingPools).filter((k) => {
      return ratingPools[k].length > 0
    })
    if (available.length === 0) {
      break
    }
    const key = available[Math.floor(Math.random() * available.length)]
    group.push(ratingPools[key].shift())
  }
  return group
}

function splitTournament(players, groupSize = 1000) {
  // Unchanged...
  const ratingPools = categorizePlayers(players)
  for (const pool of Object.values(ratingPools)) {
    shuffle(pool)
  }

  const totalPlayers = players.length
  const numGroups = Math.floor(totalPlayers / groupSize)
  const remainder = totalPlayers % groupSize

  const minExtra = Math.floor(remainder / numGroups)
  const extraGroups = remainder % numGroups

  const groups = []

  for (let i = 0; i < numGroups; i++) {
    const extra = minExtra + (i < extraGroups ? 1 : 0)
    const size = groupSize + extra
    groups.push(allocateGroup(ratingPools, size))
  }
  return groups
}

// ---------------- Main Execution (Rewritten for Multi-threading) ----------------
async function distributeTournamentGroups(id) {
  console.log(`🚀 Starting distribution for tournament ID ${id}...`)
  const players = await getPlayersByTournamentId(id)

  if (!players.length) {
    console.log(`No players found for tournament ID ${id}.`)
    return
  }
  console.log(`Found ${players.length} players. Splitting into groups...`)
  const groups = splitTournament(players)
  console.log(`Split into ${groups.length} groups. Starting workers...`)

  const workerPromises = groups.map((groupPlayers, index) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, 'split_worker.js'))

      // Listen for messages from the worker
      worker.on('message', (message) => {
        if (message.type === 'done') {
          console.log(
            `[Worker ${index + 1}] Finished: ${JSON.stringify(message.result)}`
          )
          resolve(message.result)
        } else if (message.type === 'error') {
          console.error(`[Worker ${index + 1}] Error:`, message.error)
          reject(message.error)
        }
      })

      worker.on('error', reject)
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(
            new Error(`Worker ${index + 1} stopped with exit code ${code}`)
          )
        }
      })

      // Send data to the worker to start processing
      worker.postMessage({
        groupPlayers,
        originalTournamentId: id,
        tournamentPrefix,
        groupIndex: index,
      })
    })
  })

  // Wait for all workers to complete
  try {
    await Promise.all(workerPromises)
    console.log(
      `\n🎉 All ${groups.length} groups processed successfully for tournament ID ${id}.`
    )
  } catch (error) {
    console.error(
      '\n❌ An error occurred in one or more workers. Halting process.',
      error
    )
    process.exit(1) // Exit if any worker fails
  }
}

// ---------------- Kickoff ----------------
;(async () => {
  await distributeTournamentGroups(tournamentId)

  // This runs only after all groups have been successfully created.
  console.log(`\nStopping parent tournament ${tournamentId}...`)
  const stopUrl = `${config.gameService.endpoint}/stopParentTournament`
  const stopOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.XapiKey,
    },
    body: JSON.stringify({ tournamentId }),
  }

  try {
    const stopResponse = await fetch(stopUrl, stopOptions)
    const stopJson = await stopResponse.json()
    console.log('Parent tournament stopped:', stopJson)
  } catch (error) {
    console.error('Failed to stop parent tournament:', error.message)
  }
})()
