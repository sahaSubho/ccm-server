const { getPlayerOpponentMapping } = require('./utils')
const calculateDirectEncounter = require('./directEncounter')
const calculateNumberOfWins = require('./numberOfWins')
const calculateBGP = require('./BGP')
const calculateBWG = require('./BWG')
const calculateARO = require('./ARO')
const calculateTPR = require('./TPR')
const calculatePTP = require('./PTP')
const calculateAPRO = require('./APRO')
const calculateAPPO = require('./APPO')
const calculateGE = require('./GE')
const calculateWIN = require('./WIN')
// const calculatePTP = require('./PTP')

function calculateTB1TB2TB3(players) {
  // Initialize tiebreaks object to store TB1, TB2, and TB3 for each player
  const tiebreaks = {}

  // Calculate opponent scores for each player
  Object.keys(players).forEach((id) => {
    const oppScores = players[id].reduce((p, c, i) => {
      let score = 0
      let isDraw = false
      const player = Object.values(players)
        .flat()
        .find((pa) => {
          return pa.player_id === id
        })
      if (!c) {
        if (player.scores) {
          const n = players[id].length
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
    tiebreaks[id] = { 'BH-C1': 0, BH: tb2, SB: 0 }

    // Calculate TB1 - Sum of Opponent Scores excluding the lowest opponent score
    const tb1 =
      tb2 -
      (modifiedOppScores.length > 0
        ? modifiedOppScores[modifiedOppScores.length - 1]
        : 0)
    tiebreaks[id]['BH-C1'] = tb1

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
    tiebreaks[id].SB = tb3
  })

  return tiebreaks
}

const getTieBreakByCode = (code, data, setting = {}) => {
  switch (code) {
    case 'DE':
      return calculateDirectEncounter(data)
    case 'GE':
      return calculateGE(data)
    case 'REP':
      return calculateNumberOfWins(data)
    case 'BGP':
      return calculateBGP(data)
    case 'BWG':
      return calculateBWG(data)
    case 'ARO':
      return calculateARO(data)
    case 'TPR':
      return calculateTPR(data)
    case 'PTP':
      return calculatePTP(data)
    case 'APRO':
      return calculateAPRO(data)
    case 'APPO':
      return calculateAPPO(data)
    case 'WIN':
      return calculateWIN(data, setting)
    default:
      break
  }
}

function getTieBreaks(data, round, trnConfig) {
  const playersMapping = getPlayerOpponentMapping(data)
  const tieBreakerResult = calculateTB1TB2TB3(playersMapping)

  const othertieBreaks = trnConfig?.tiebreaks?.reduce((acc, code) => {
    acc[code] = getTieBreakByCode(
      code,
      data,
      trnConfig?.tiebreak_settings?.[code]
    )
    return acc
  }, {})

  const player_ids = [
    ...new Set(
      data.map((d) => {
        return d.player_id
      })
    ),
  ]

  const players = player_ids
    .map((id) => {
      const e = data
        .filter((d) => {
          return d.player_id === id
        })
        .pop()
      const tie_breaks = trnConfig?.tiebreaks?.reduce((acc, code, i) => {
        acc[`TB${i + 1}`] = othertieBreaks[code]
          ? othertieBreaks[code][e.player_id]
          : tieBreakerResult[e.player_id][code]
        return acc
      }, {})
      return {
        ...e,
        ...tie_breaks,
        tieSum: Object.values(tieBreakerResult[e.player_id]).reduce((a, b) => {
          return a + b
        }, 0),
        point: Number(e.player_score) + Number(e.result),
        tie_breaks,
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
