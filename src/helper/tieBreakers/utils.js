/* eslint-disable no-param-reassign */
const getPlayerOpponentMapping = (data) => {
  const playersMapping = data.reduce((p, c) => {
    const opponent = {
      id: c.id,
      player_uuid: c.player_uuid,
      rating: c.player_rating,
      scores: data
        .filter((d) => {
          return d.player_uuid === c.player_uuid
        })
        .map((o) => {
          return {
            round: o.round,
            score: o.player_score,
            result: o.result,
          }
        }),
    }
    let player
    if (c.parent_id) {
      player = data.find((d) => {
        return d.id === c.parent_id && d.round === c.round
      })
    } else {
      player = data.find((d) => {
        return d.parent_id === c.id && d.round === c.round
      })
    }
    if (player) {
      p[player.player_uuid] = p[player.player_uuid]
        ? [...p[player.player_uuid], opponent]
        : [opponent]
    } else {
      p[c.player_uuid] = p[c.player_uuid] ? [...p[c.player_uuid]] : []
    }
    return p
  }, {})
  return playersMapping
}

function findIntervalWithNumber(intervals, number) {
  for (let i = 0; i < intervals.length; i += 1) {
    // Split the string into start and end values
    const interval = intervals[i].split('-').map(Number)

    // Check if the number falls within the interval
    if (interval[0] <= number && number <= interval[1]) {
      return intervals[i]
    }
  }
  return null
}

module.exports = {
  getPlayerOpponentMapping,
  findIntervalWithNumber,
}
