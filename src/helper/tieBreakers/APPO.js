/* eslint-disable no-param-reassign */
const calculatePTP = require('./PTP')
const { getPlayerOpponentMapping } = require('./utils')

function calculateAPPO(data) {
  const players = getPlayerOpponentMapping(data)
  const PTP = calculatePTP(data)
  const result = {}
  Object.keys(players).forEach((id) => {
    const totalOppPTP = players[id].reduce((t, o) => {
      return t + PTP[o.player_id]
    }, 0)
    result[id] = Math.round(totalOppPTP / players[id].length)
  })
  return result
}

module.exports = calculateAPPO
