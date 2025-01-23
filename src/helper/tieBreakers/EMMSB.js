/* eslint-disable no-param-reassign */
const { getTeamOpponentMapping } = require('./utils')

function calculateEMMSB(teams) {
  const opponents = getTeamOpponentMapping(teams)
  teams.forEach((team) => {
    team.emmsb =
      opponents[team.id].reduce((sum, opponent) => {
        return sum + opponent.match_point
      }, 0) * team.match_point
  })
  return teams.sort((a, b) => {
    return b.emmsb - a.emmsb
  })
}

module.exports = calculateEMMSB
