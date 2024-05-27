const { getPlayerOpponentMapping } = require('./utils')
const calculateDirectEncounter = require('./directEncounter')
const calculateNumberOfWins = require('./numberOfWins')
const calculatePTP = require('./PTP')

function calculateTB1TB2TB3(players) {
  // Initialize tiebreaks object to store TB1, TB2, and TB3 for each player
  const tiebreaks = {}

  // Calculate opponent scores for each player
  Object.keys(players).forEach((uuid) => {
    const oppScores = players[uuid].reduce((p, c, i) => {
      let score = 0
      let isDraw = false
      const player = Object.values(players)
        .flat()
        .find((p) => {
          return p.player_uuid === Number(uuid)
        })
      if (!c) {
        if (player.scores) {
          const n = players[uuid].length
          const r = i + 1
          const current = player.scores[i]
          score =
            Number(current.score) + (1 - Number(current.result)) + 0.5 * (n - r)
        }
      } else {
        score = c.scores.reduce((a, b) => {
          return a + Number(b.result)
        }, 0)
        if (
          player?.scores[i]?.result === c?.scores[i]?.result &&
          Number(player?.scores[i]?.result) === 0.5
        ) {
          isDraw = true
        }
      }
      p.push({ score, isDraw })
      return p
    }, [])

    const modifiedOppScores = oppScores.map((p) => {
      return p.score
    })
    // Sort in descending order to easily calculate TB2.
    modifiedOppScores.sort((a, b) => {
      return b - a
    })
    // Calculate TB2 - Sum of Opponent Scores
    const tb2 = modifiedOppScores.reduce((acc, score) => {
      return acc + score
    }, 0)
    tiebreaks[uuid] = { TB1: 0, TB2: tb2, TB3: 0 }

    // Calculate TB1 - Sum of Opponent Scores excluding the lowest opponent score
    const tb1 =
      tb2 -
      (modifiedOppScores.length > 0
        ? modifiedOppScores[modifiedOppScores.length - 1]
        : 0)
    tiebreaks[uuid].TB1 = tb1

    // Step 4: Calculate TB3 - Sonneborn-Berger score
    const tb3 =
      oppScores
        .filter((p) => {
          return !p.isDraw
        })
        .reduce((acc, p) => {
          return acc + p.score
        }, 0) +
      0.5 *
        oppScores
          .filter((p) => {
            return p.isDraw
          })
          .reduce((acc, p) => {
            return acc + p.score
          }, 0)
    tiebreaks[uuid].TB3 = tb3
  })

  return tiebreaks
}

function getTieBreaks(data, round) {
  const playersMapping = getPlayerOpponentMapping(data)
  const tieBreakerResult = calculateTB1TB2TB3(playersMapping)
  const directEncounter = calculateDirectEncounter(data)
  const noOfWins = calculateNumberOfWins(data)

  const players = data
    .filter((d) => {
      return d.round === round
    })
    .map((e) => {
      return {
        ...e,
        ...tieBreakerResult[e.player_uuid],
        TB4: directEncounter[e.player_uuid],
        TB5: noOfWins[e.player_uuid],
        tieSum: Object.values(tieBreakerResult[e.player_uuid]).reduce(
          (a, b) => {
            return a + b
          },
          0
        ),
        point: Number(e.player_score) + Number(e.result),
      }
    })
    .sort((a, b) => {
      if (b.point === a.point) {
        if (b.TB1 === a.TB1) {
          if (b.TB2 === a.TB2) {
            if (b.TB3 === a.TB3) {
              if (b.TB4 === a.TB4) {
                if (b.TB5 === a.TB5) {
                  return (
                    b.player_rating - a.player_rating ||
                    a.player_name.localeCompare(b.player_name)
                  )
                }
                return b.TB5 - a.TB5
              }
              return b.TB4 - a.TB4
            }
            return b.TB3 - a.TB3
          }
          return b.TB2 - a.TB2
        }
        return b.TB1 - a.TB1
      }
      return b.point - a.point
    })
  return players
}

module.exports = getTieBreaks
