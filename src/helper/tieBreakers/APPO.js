/* eslint-disable no-param-reassign */
const calculatePTP = require('./PTP')
const { getPlayerOpponentMapping } = require('./utils')

function calculateAPPO(data) {
  const players = getPlayerOpponentMapping(data)
  const PTP = calculatePTP(data)
  const result = {}
  Object.keys(players).forEach((uuid) => {
    const totalOppPTP = players[uuid].reduce((t, o) => {
      return t + PTP[o.player_uuid]
    }, 0)
    result[uuid] = Math.round(totalOppPTP / players[uuid].length)
  })
  return result
}

module.exports = calculateAPPO
