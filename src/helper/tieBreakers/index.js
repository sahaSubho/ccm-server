const { getPlayerOpponentMapping } = require('./utils')
const calculateDirectEncounter = require('./directEncounter')
const calculateNumberOfWins = require('./numberOfWins')
const calculateBGP = require('./BGP')
const calculateBWG = require('./BWG')
const calculateARO = require('./ARO')
const calculateTPR = require('./TPR')
const calculatePTP = require('./PTP')
const calculateAPRO = require('./APRO')
const calculateAPPO = require('./APPO')
const calculateGE = require('./GE')
const calculateWIN = require('./WIN')
// const calculatePTP = require('./PTP')

function calculateTB1TB2TB3(players) {
  const tiebreaks = {};

  // Precompute direct player lookup for scores
  const playerScores = {};
  for (const [id, opponents] of Object.entries(players)) {
    const oppScores = opponents?.[0]?.scores; // All have same player_id’s scores array
    if (oppScores) {
      playerScores[id] = oppScores;
    }
  }

  // Main loop — O(total number of opponents)
  for (const [id, opponents] of Object.entries(players)) {
    let totalOppScore = 0;
    let minOppScore = Infinity;
    let tb3Score = 0;

    const playerScoresArr = playerScores[id] || [];
    const n = opponents.length;

    for (let i = 0; i < n; i++) {
      const opp = opponents[i];
      let score = 0;
      let isDraw = false;

      if (!opp) {
        // No opponent in this round — apply special calc
        const current = playerScoresArr[i];
        if (current) {
          score =
            Number(current.score) +
            (1 - Number(current.result)) +
            0.5 * (n - (i + 1));
        }
      } else {
        // Sum opponent's results
        let s = 0;
        const oppScoresArr = opp.scores;
        for (let j = 0; j < oppScoresArr.length; j++) {
          s += Number(oppScoresArr[j].result);
        }
        score = s;

        // Draw check
        if (
          playerScoresArr[i] &&
          oppScoresArr[i] &&
          playerScoresArr[i].result === oppScoresArr[i].result &&
          Number(playerScoresArr[i].result) === 0.5
        ) {
          isDraw = true;
        }
      }

      // TB2 sum
      totalOppScore += score;

      // TB1 min
      if (score < minOppScore) minOppScore = score;

      // TB3 score
      tb3Score += isDraw ? 0.5 * score : score;
    }

    const tb2 = totalOppScore;
    const tb1 = tb2 - (minOppScore === Infinity ? 0 : minOppScore);

    tiebreaks[id] = { 'BH-C1': tb1, BH: tb2, SB: tb3Score };
  }

  return tiebreaks;
}


function ccalculateTB1TB2TB3(players) {
	const tiebreaks = {};

	const playerInfo = {};
	for (const [id, opponents] of Object.entries(players)) {
		for (const opp of opponents) {
			if (!playerInfo[opp.player_id]) playerInfo[opp.player_id] = opp;
		}
	}

	for (const [id, opponents] of Object.entries(players)) {
		let totalOppScore = 0;
		let minOppScore = Infinity;
		let tb3Score = 0;

		const player = playerInfo[id];
		const n = opponents.length;

		opponents.forEach((opp, i) => {
			let score = 0;
			let isDraw = false;

			if (!opp) {
				if (player?.scores) {
					const r = i + 1;
					const current = player.scores[i];
					score =
						Number(current.score) +
						(1 - Number(current.result)) +
						0.5 * (n - r);
				}
			} else {
				score = opp.scores.reduce((a, b) => a + Number(b.result), 0);
				if (
					player?.scores[i]?.result === opp?.scores[i]?.result &&
					Number(player?.scores[i]?.result) === 0.5
				) {
					isDraw = true;
				}
			}

			totalOppScore += score;
			if (score < minOppScore) minOppScore = score;

			tb3Score += isDraw ? 0.5 * score : score;
		});

    const tb2 = totalOppScore;
    const tb1 = tb2 - (minOppScore === Infinity ? 0 : minOppScore);

    tiebreaks[id] = {
	          'BH-C1': tb1,
	          BH: tb2,
	          SB: tb3Score,
	        };
	  }

  return tiebreaks;
}

const getTieBreakByCode = (code, data, setting = {}) => {
  switch (code) {
    case 'DE':
      return calculateDirectEncounter(data)
    case 'GE':
      return calculateGE(data)
    case 'REP':
      return calculateNumberOfWins(data)
    case 'BGP':
      return calculateBGP(data)
    case 'BWG':
      return calculateBWG(data)
    case 'ARO':
      return calculateARO(data)
    case 'TPR':
      return calculateTPR(data)
    case 'PTP':
      return calculatePTP(data)
    case 'APRO':
      return calculateAPRO(data)
    case 'APPO':
      return calculateAPPO(data)
    case 'WIN':
      return calculateWIN(data, setting)
    default:
      break
  }
}

function getTieBreaks(data, round, trnConfig) {
  const playersMapping = getPlayerOpponentMapping(data)
  const tieBreakerResult = calculateTB1TB2TB3(playersMapping)

  const othertieBreaks = trnConfig?.tiebreaks?.reduce((acc, code) => {
    acc[code] = getTieBreakByCode(
      code,
      data,
      trnConfig?.tiebreak_settings?.[code]
    )
    return acc
  }, {})

  const player_ids = [
    ...new Set(
      data.map((d) => {
        return d.player_id
      })
    ),
  ]

  const players = player_ids
    .map((id) => {
      const e = data
        .filter((d) => {
          return d.player_id === id
        })
        .pop()
      const tie_breaks = trnConfig?.tiebreaks?.reduce((acc, code, i) => {
        acc[`TB${i + 1}`] = othertieBreaks[code]
          ? othertieBreaks[code][e.player_id]
          : tieBreakerResult[e.player_id][code]
        return acc
      }, {})
      
      delete e.id
      return {
        ...e,
        round,
        tournament_id: e.tournament_id,
        player_id: e.player_id,
        player_name: e.player_name,
        player_rating: e.player_rating,
        cc_userid: e.cc_userid,
        ...tie_breaks,
        tieSum: Object.values(tieBreakerResult[e.player_id]).reduce((a, b) => {
          return a + b
        }, 0),
        point: Number(e.player_score) + Number(e.result),
        tie_breaks,
      }
    })
    .sort((a, b) => {
      if (b.point === a.point) {
        if (b.TB1 === a.TB1) {
          if (b.TB2 === a.TB2) {
            if (b.TB3 === a.TB3) {
              if (b.TB4 === a.TB4) {
                if (b.TB5 === a.TB5) {
                  return (
                    b.player_rating - a.player_rating ||
                    a.player_name.localeCompare(b.player_name)
                  )
                }
                return b.TB5 - a.TB5
              }
              return b.TB4 - a.TB4
            }
            return b.TB3 - a.TB3
          }
          return b.TB2 - a.TB2
        }
        return b.TB1 - a.TB1
      }
      return b.point - a.point
    })
  return players
}

module.exports = getTieBreaks



