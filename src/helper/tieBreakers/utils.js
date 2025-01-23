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

function processResult(result, playersType, config = { bye_point: 1 }) {
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
    case '+-':
      modifiedResult = [Number(config?.bye_point), 0]
      break
    default:
      break
  }
  if (playersType === 'player') {
    return Number(modifiedResult[0])
  }
  return Number(modifiedResult[1])
}

function convertPlayersResultInNumeric(data, config) {
  const result = data.reduce((a, b) => {
    const obj = {
      ...b,
      player_result: b.result,
    }
    if (typeof b.result === 'string') {
      obj.result = processResult(
        b.result,
        !b.parent_id ? 'player' : 'opponent',
        config
      )
    }
    a.push(obj)
    return a
  }, [])
  return result
}

const getTeamOpponentMapping = (data, round) => {
  const teamsScoreData = data
    .filter((d) => {
      return d.round === round
    })
    .reduce((a, b) => {
      a[b.team_id] = b
      return a
    }, {})
  const teamsMapping = data.reduce((p, c) => {
    const opponent = teamsScoreData[c.team_id]
    let team
    if (c.parent_id) {
      team = data.find((d) => {
        return d.id === c.parent_id && d.round === c.round
      })
    } else {
      team = data.find((d) => {
        return d.parent_id === c.id && d.round === c.round
      })
    }
    if (team) {
      p[team.id] = p[team.id] ? [...p[team.id], opponent] : [opponent]
    } else {
      p[c.id] = p[c.id] ? [...p[c.id]] : []
    }
    return p
  }, {})
  return teamsMapping
}

const getTeamScorePerRound = (data) => {
  const teamScores = {}
  data.forEach((team) => {
    const obj = {
      ...team,
      opp_id: data.find((d) => {
        return d.id === team.parent_id || d.parent_id === team.id
      })?.team_id,
    }
    if (teamScores[team.team_id]) {
      teamScores[team.team_id].push(obj)
    } else {
      teamScores[team.team_id] = [obj]
    }
  })
}

module.exports = {
  processResult,
  getPlayerOpponentMapping,
  findIntervalWithNumber,
  convertPlayersResultInNumeric,
  getTeamOpponentMapping,
  getTeamScorePerRound,
}
