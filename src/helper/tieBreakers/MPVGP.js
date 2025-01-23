function calculateMPVGP(teams, primaryScore = 'match_point') {
  return teams.sort((a, b) => {
    if (a[primaryScore] === b[primaryScore]) {
      return b.game_point - a.game_point
    }
    return b[primaryScore] - a[primaryScore]
  })
}

module.exports = calculateMPVGP
