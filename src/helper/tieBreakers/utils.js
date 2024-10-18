/* eslint-disable no-param-reassign */
const getPlayerOpponentMapping = (data) => {
  const playersMapping = data.reduce((p, c) => {
    const opponent = {
      id: c.id,
      player_id: c.player_id,
      rating: c.player_rating,
      scores: data
        .filter((d) => {
          return d.player_id === c.player_id
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
      p[player.player_id] = p[player.player_id]
        ? [...p[player.player_id], opponent]
        : [opponent]
    } else {
      p[c.player_id] = p[c.player_id] ? [...p[c.player_id]] : []
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

function processResult(result, playersType) {
  let modifiedResult = [0, 0]
  switch (result) {
    case '--+':
    case '0-1':
      modifiedResult = [0, 1]
      break
    case '1-0':
    case '+--':
      modifiedResult = [1, 0]
      break
    case '0.5-0.5':
    case '---':
      modifiedResult = [0.5, 0.5]
      break
    default:
      break
  }
  if (playersType === 'player') {
    return Number(modifiedResult[0])
  }
  return Number(modifiedResult[1])
}

function convertPlayersResultInNumeric(data) {
  return data.reduce((a, b) => {
    const obj = {
      ...b,
      player_result: b.result,
    }
    if (typeof b.result === 'string') {
      obj.result = processResult(b.result, !b.parent_id ? 'player' : 'opponent')
    }

    a.push(obj)
    return a
  }, [])
}

module.exports = {
  getPlayerOpponentMapping,
  findIntervalWithNumber,
  convertPlayersResultInNumeric,
}
