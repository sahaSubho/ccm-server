/* eslint-disable no-param-reassign */
const { getTeamScorePerRound } = require('./utils')

function getTeamEDE(teams, tieBreaks) {
  teams
}

function calculateEDE(teams, round) {
  const teamsWithScore = getTeamScorePerRound(teams).sort((a, b) => {
    return b.match_point - a.match_point
  })
  const tieBreaks = {}
  const mpTeams = {}
  teams
    .filter((tws) => {
      return tws.round === round
    })
    .forEach((t) => {
      if (mpTeams[t.match_point]) {
        mpTeams[t.match_point].push(t)
      } else {
        mpTeams[t.match_point] = [t]
      }
    })
  let rank = 0
  Object.keys(mpTeams)
    .sort((a, b) => {
      return Number(b) - Number(a)
    })
    .forEach((mt) => {
      if (mpTeams[mt].length > 1) {
        getTeamEDE(mpTeams[mt], tieBreaks)
      } else {
        rank += 1
        const team = mpTeams[mt][0]
        tieBreaks[team.team_id] = rank
      }
    })
}

module.exports = calculateEDE
