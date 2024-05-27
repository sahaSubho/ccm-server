/* eslint-disable no-param-reassign */
const calculateTPR = require('./TPR')
const { getPlayerOpponentMapping } = require('./utils')

function calculateAPRO(data) {
  const players = getPlayerOpponentMapping(data)
  const TPR = calculateTPR(data)
  const result = {}
  Object.keys(players).forEach((uuid) => {
    const totalOppTPR = players[uuid].reduce((t, o) => {
      return t + TPR[o.player_uuid]
    }, 0)
    result[uuid] = Math.round(totalOppTPR / players[uuid].length)
  })
  return result
}

module.exports = calculateAPRO
