/* eslint-disable no-restricted-syntax */
/* eslint-disable no-return-await */
/* eslint-disable no-await-in-loop */
// const { Op } = require('sequelize')
// const { Players } = require('./models') // adjust as needed
const PlayersDao = require('../src/dao/TournamentPlayersDao')
const TournamentDao = require('../src/dao/TournamentDao')
const TournamentConfigurationDao = require('../src/dao/TournamentConfigurationDao')
const config = require('../src/config/config')

const playerDao = new PlayersDao()

// ---------------- Fetch Tournament ID from CLI ----------------
const tournamentId = process.argv[2]
const tournamentPrefix = process.argv[3]

if (!tournamentId) {
  console.error(
    '❌ Please provide a tournament ID. Example:\n   node split.js 123'
  )
  process.exit(1)
}

// ---------------- Fetch Players from DB ----------------
async function getPlayersByTournamentId(id) {
  return await playerDao.findByWhere({ tournament_id: id }, [
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

// ---------------- Categorize by Rating ----------------
function categorizePlayers(players) {
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

// ---------------- Utility: Shuffle ----------------
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

// ---------------- Random Distribution ----------------
function generateRandomRatios() {
  const r1 = Math.floor(Math.random() * 20) + 10
  const r2 = Math.floor(Math.random() * 20) + 20
  const r3 = Math.floor(Math.random() * 30) + 20
  const total = r1 + r2 + r3
  const r4 = 100 - total
  return {
    '2000+': r1,
    '1800-2000': r2,
    '1400-1800': r3,
    '<1400': r4,
  }
}

function allocateGroup(ratingPools, groupSize = 1000) {
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
  const ratingPools = categorizePlayers(players)
  for (const pool of Object.values(ratingPools)) {
    shuffle(pool)
  }

  const totalGroups = Math.ceil(players.length / groupSize)
  const groups = []

  for (let i = 0; i < totalGroups; i++) {
    const group = allocateGroup(ratingPools, groupSize)
    groups.push(group)
  }

  return groups
}

// ---------------- Main Execution ----------------
async function distributeTournamentGroups(id) {
  const players = await getPlayersByTournamentId(id)

  if (!players.length) {
    console.log(`⚠️ No players found for tournament ID ${id}`)
    return
  }

  const groups = splitTournament(players)

  const tournamentDao = new TournamentDao()
  for (let i = 0; i < groups.length; i++) {
    const groupPlayers = groups[i]

    // 1. Create group tournament
    const tournament = await tournamentDao.findById(id)
    delete tournament.id
    const tournamentName = `${tournamentPrefix} - Group ${i + 1}`
    const groupTournament = await tournamentDao.create({
      ...tournament,
      name: `${tournamentPrefix} - Group ${i + 1}`,
      parent_id: tournamentId, // If you have a parent/child relationship
    })

    console.log('groupTournament', JSON.stringify(groupTournament))

    const groupTournamentId = groupTournament.id

    if (groupTournamentId) {
      await tournamentDao.updateById(
        {
          address: `https://learn.circlechess.com/playChess?tournamentId=${groupTournamentId}&tournamentName=${tournamentName?.replace(
            /\s/g,
            '-'
          )}`,
        },
        groupTournamentId
      )
      const defaultConfig = {
        tournament_id: groupTournamentId,
        tiebreaks: ['BH-C1', 'BH', 'SB'],
        tiebreak_settings: {
          BH: { games: { best: '1', worst: '0' } },
          SB: { games: { best: '1', worst: '0' } },
          'BH-C1': { games: { best: '1', worst: '0' } },
        },
      }

      const tnrConfig = new TournamentConfigurationDao()
      await tnrConfig.create(defaultConfig)

      const url = `${config.gameService.endpoint}/createTournament`
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.XapiKey, // Include any required API key
        },
        body: JSON.stringify({ tournamentData: groupTournament }), // Include the tournament data
      }
      const response = await fetch(url, options)
      const jsonResponse = await response.json()
      console.log(response, jsonResponse)
    }

    // 2. Bulk insert players into new group tournament
    const newPlayers = groupPlayers.map((player) => {
      return {
        ...player,
        tournament_id: groupTournamentId,
      }
    })

    await playerDao.bulkCreate(newPlayers)
    console.log(
      `✅ Group ${i + 1}: ${
        newPlayers.length
      } players saved to tournament ID ${groupTournamentId}`
    )
    // const fileName = `group_tournament_${id}_${i + 1}.json`
    // fs.writeFileSync(fileName, JSON.stringify(groups[i], null, 2))
  }

  console.log(
    `✅ Distributed ${players.length} players into ${groups.length} groups for tournament ID ${id}.`
  )
}

// Kickoff
;(async () => {
  await distributeTournamentGroups(tournamentId)
})()
