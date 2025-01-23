/* eslint-disable no-param-reassign */
const calculateARO = require('./ARO')
const { fractionalScore } = require('./constants')

function calculateTPR(data) {
  const ARO = calculateARO(data)
  const playersScore = data.reduce((p, c) => {
    if (p[c.player_id]) {
      p[c.player_id].score += Number(c.result)
      p[c.player_id].count += 1
    } else {
      p[c.player_id] = {
        score: Number(c.result),
        count: 1,
      }
    }
    return p
  }, {})
  const result = {}
  Object.keys(playersScore).forEach((id) => {
    const playerScore = playersScore[id]
    const avg = Number(playerScore.score / playerScore.count).toFixed(2)
    const dp = fractionalScore[avg]
    result[id] = ARO[id] + dp
  })
  return result
}

module.exports = calculateTPR
