/* eslint-disable no-param-reassign */
const calculateTPR = require('./TPR')
const { getPlayerOpponentMapping } = require('./utils')

function calculateAPRO(data) {
  const players = getPlayerOpponentMapping(data)
  const TPR = calculateTPR(data)
  const result = {}
  Object.keys(players).forEach((id) => {
    const totalOppTPR = players[id].reduce((t, o) => {
      return t + TPR[o.player_id]
    }, 0)
    result[id] = Math.round(totalOppTPR / players[id].length)
  })
  return result
}

module.exports = calculateAPRO
