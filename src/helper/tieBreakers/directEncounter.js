/* eslint-disable no-param-reassign */
const { getPlayerOpponentMapping } = require('./utils')

const getDEOponentScores = (players) => {
  const result = Object.keys(players).reduce((acc, id) => {
    const oppScores = players[id].reduce((p, c) => {
      let score = 0
      if (c) {
        score = c.scores.reduce((a, b) => {
          return a + Number(b.result)
        }, 0)
      }
      p += score
      return p
    }, 0)
    if (acc[oppScores]) {
      acc[oppScores].push({ id, score: oppScores })
    } else {
      acc[oppScores] = [{ id, score: oppScores }]
    }
    return acc
  }, {})
  return result
}

const getDEtieBreaks = (result, data, tieBreaks) => {
  Object.values(result).forEach((r) => {
    if (r.length === 1) {
      tieBreaks[r[0].id] = r[0].score
    } else {
      const players = r
      const filteredPlayers = data.filter((d) => {
        return players
          .map((p) => {
            return p.id
          })
          .includes(d.player_id)
      })
      const mapping = getPlayerOpponentMapping(filteredPlayers)
      const updatedResult = getDEOponentScores(mapping)
      if (Object.keys(updatedResult).length === 1) {
        const playersTieBreaks = Object.values(updatedResult)[0].reduce(
          (a, b) => {
            a[b.id] = b.score
            return a
          },
          {}
        )
        Object.assign(tieBreaks, playersTieBreaks)
      } else {
        getDEtieBreaks(updatedResult, data, tieBreaks)
      }
    }
  })
  return tieBreaks
}

function calculateDirectEncounter(data) {
  const playersMapping = getPlayerOpponentMapping(data)
  const result = getDEOponentScores(playersMapping)
  const tieBreaks = getDEtieBreaks(result, data, {})
  return tieBreaks
}

module.exports = calculateDirectEncounter
