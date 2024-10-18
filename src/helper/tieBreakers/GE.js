/* eslint-disable no-param-reassign */
function calculateGE(data) {
  const result = data.reduce((p, c) => {
    if (p[c.player_id]) {
      p[c.player_id] += Number(c.result)
    } else {
      p[c.player_id] = Number(c.result)
    }
    return p
  }, {})
  return result
}

module.exports = calculateGE
