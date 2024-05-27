/* eslint-disable no-param-reassign */
function calculateBWG(data) {
  const result = data.reduce((p, c) => {
    let player
    if (!c.parent_id) {
      player = data.find((d) => {
        return d.parent_id === c.id && d.round === c.round
      })
    }
    if (player && Number(c.result) === 1) {
      if (p[c.player_uuid]) {
        p[c.player_uuid] += 1
      } else {
        p[c.player_uuid] = 1
      }
    }
    return p
  }, {})
  return result
}

module.exports = calculateBWG
