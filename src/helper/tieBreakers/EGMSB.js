/* eslint-disable no-param-reassign */
const { getTeamOpponentMapping } = require('./utils')

function calculateEGMSB(teams) {
  const opponents = getTeamOpponentMapping(teams)
  teams.forEach((team) => {
    team.egmsb =
      opponents[team.id].reduce((sum, opponent) => {
        return sum + opponent.game_point
      }, 0) * team.match_point
  })
  return teams.sort((a, b) => {
    return b.egmsb - a.egmsb
  })
}

module.exports = calculateEGMSB
