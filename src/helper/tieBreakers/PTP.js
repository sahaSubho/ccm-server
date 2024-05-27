/* eslint-disable no-loop-func */
/* eslint-disable no-param-reassign */
const { getPlayerOpponentMapping, findIntervalWithNumber } = require('./utils')
const calculateTPR = require('./TPR')
const { ratingDifference } = require('./constants')

function calculatePTP(data) {
  const players = getPlayerOpponentMapping(data)
  const TPR = calculateTPR(data)
  const playerScore = data.reduce((p, c) => {
    if (p[c.player_uuid]) {
      p[c.player_uuid] += Number(c.result)
    } else {
      p[c.player_uuid] = Number(c.result)
    }
    return p
  }, {})
  const result = {}

  Object.keys(players).forEach((uuid) => {
    let TPRValue = TPR[uuid]
    let totalDp = 0

    while (playerScore[uuid] !== totalDp) {
      totalDp = players[uuid].reduce((t, r) => {
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
      if (playerScore[uuid] > totalDp) {
        TPRValue += TPRValue * ((playerScore[uuid] - totalDp) / 10)
      } else if (playerScore[uuid] < totalDp) {
        TPRValue -= TPRValue * ((totalDp - playerScore[uuid]) / 10)
      }
      TPRValue = Math.round(TPRValue)
    }
    result[uuid] = TPRValue
  })
  return result
}

module.exports = calculatePTP
