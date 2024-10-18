/* eslint-disable no-param-reassign */
function calculateNumberOfWins(data) {
  const tieBreaks = data.reduce((p, c) => {
    if (
      Number(c.result) === 0.5 ||
      (!c.parent_id &&
        !data.find((d) => {
          return d.parent_id === c.id && d.round === c.round
        }))
    ) {
      c.result = 0
    }
    if (p[c.player_id]) {
      p[c.player_id] += Number(c.result)
    } else {
      p[c.player_id] = Number(c.result)
    }
    return p
  }, {})
  return tieBreaks
}

module.exports = calculateNumberOfWins
