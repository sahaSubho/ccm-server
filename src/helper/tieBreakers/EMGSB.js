/* eslint-disable no-param-reassign */
const { getTeamOpponentMapping } = require('./utils')

function calculateEMGSB(teams) {
  const opponents = getTeamOpponentMapping(teams)
  teams.forEach((team) => {
    team.emgsb =
      opponents[team.id].reduce((sum, opponent) => {
        return sum + opponent.match_point
      }, 0) * team.game_point
  })
  return teams.sort((a, b) => {
    return b.emgsb - a.emgsb
  })
}

module.exports = calculateEMGSB
