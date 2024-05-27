/* eslint-disable no-param-reassign */
const calculateARO = require('./ARO')
const { fractionalScore } = require('./constants')

function calculateTPR(data) {
  const ARO = calculateARO(data)
  const playersScore = data.reduce((p, c) => {
    if (p[c.player_uuid]) {
      p[c.player_uuid].score += Number(c.result)
      p[c.player_uuid].count += 1
    } else {
      p[c.player_uuid] = {
        score: Number(c.result),
        count: 1,
      }
    }
    return p
  }, {})
  const result = {}
  Object.keys(playersScore).forEach((uuid) => {
    const playerScore = playersScore[uuid]
    const avg = Number(playerScore.score / playerScore.count).toFixed(2)
    const dp = fractionalScore[avg]
    console.log(avg, dp, ARO[uuid])
    result[uuid] = ARO[uuid] + dp
  })
  return result
}

module.exports = calculateTPR
