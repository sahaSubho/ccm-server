/* eslint-disable no-param-reassign */
const { getTeamOpponentMapping } = require('./utils')

function calculateEGGSB(teams) {
  const opponents = getTeamOpponentMapping(teams)
  teams.forEach((team) => {
    team.eggsb =
      opponents[team.id].reduce((sum, opponent) => {
        return sum + opponent.game_point
      }, 0) * team.game_point
  })
  return teams.sort((a, b) => {
    return b.eggsb - a.eggsb
  })
}

module.exports = calculateEGGSB
