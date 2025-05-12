/* eslint-disable no-param-reassign */
function calculateWIN(data, setting) {
  // console.log('WIN', JSON.stringify(data.filter((d) => d.player_id === 13235)))
  const result = data.reduce((p, c) => {
    if(!p[c.player_id])
      p[c.player_id] = 0
    if (setting?.forfeit && Number(c.result) === 1) {
      p[c.player_id] += 1
    }else if (!['+--','--+'].includes(c.player_result) && Number(c.result) === 1) {
      p[c.player_id] += 1
    }
    return p
  }, {})
  return result
}

module.exports = calculateWIN
