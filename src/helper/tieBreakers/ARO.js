const { getPlayerOpponentMapping } = require('./utils')

function calculateARO(data) {
  const players = getPlayerOpponentMapping(data)
  const result = {}
  Object.keys(players).forEach((uuid) => {
    const totalRating = players[uuid].reduce((t, r) => {
      return t + r.rating
    }, 0)
    const avgRating = totalRating / players[uuid].length
    result[uuid] = avgRating
  })
  return result
}

module.exports = calculateARO
