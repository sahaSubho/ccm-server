/* eslint-disable no-loop-func */
/* eslint-disable no-param-reassign */
const { getPlayerOpponentMapping, findIntervalWithNumber } = require('./utils')
const calculateTPR = require('./TPR')
const { ratingDifference } = require('./constants')

function calculatePTP(data) {
  const players = getPlayerOpponentMapping(data)
  const TPR = calculateTPR(data)
  const playerScore = data.reduce((p, c) => {
    if (p[c.player_id]) {
      p[c.player_id] += Number(c.result)
    } else {
      p[c.player_id] = Number(c.result)
    }
    return p
  }, {})
  const result = {}

  Object.keys(players).forEach((id) => {
    let TPRValue = TPR[id]
    let totalDp = 0

    while (playerScore[id] !== totalDp) {
      totalDp = players[id].reduce((t, r) => {
        const ratingDiff = TPRValue - r.rating
        const ratingKey = findIntervalWithNumber(
          Object.keys(ratingDifference),
          Math.abs(ratingDiff)
        )
        const dp =
          ratingDiff > 0
            ? ratingDifference[ratingKey].high
            : ratingDifference[ratingKey].low

        return t + dp
      }, 0)
      if (playerScore[id] > totalDp) {
        TPRValue += TPRValue * ((playerScore[id] - totalDp) / 10)
      } else if (playerScore[id] < totalDp) {
        TPRValue -= TPRValue * ((totalDp - playerScore[id]) / 10)
      }
      TPRValue = Math.round(TPRValue)
    }
    result[id] = TPRValue
  })
  return result
}

module.exports = calculatePTP
