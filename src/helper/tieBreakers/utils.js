/* eslint-disable no-param-reassign */

/* eslint-disable no-param-reassign */

const getPlayerOpponentMapping = (data) => {
	const scoresByPlayer = {};
	for (const row of data) {
		if (!scoresByPlayer[row.player_id]) scoresByPlayer[row.player_id] = [];
		scoresByPlayer[row.player_id].push({
			round: row.round,
			score: row.player_score,
			result: row.result,
		});
	}

	const byId = {};
	for (const row of data) {
		byId[row.id] = row;
	}

	const playersMapping = {};
	for (const row of data) {
		const opponent = {
			id: row.id,
			player_id: row.player_id,
			rating: row.player_rating,
			scores: scoresByPlayer[row.player_id] || [],
		};

		let playerRow;
		if (row.parent_id) {
			playerRow = byId[row.parent_id];
		} else {
			playerRow = Object.values(byId).find(
				d => d.parent_id === row.id && d.round === row.round
			);
		}

		if (playerRow) {
			if (!playersMapping[playerRow.player_id]) playersMapping[playerRow.player_id] = [];
			playersMapping[playerRow.player_id].push(opponent);
		} else {

			if (!playersMapping[row.player_id]) playersMapping[row.player_id] = [];
		}

	}
		  return playersMapping;
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
