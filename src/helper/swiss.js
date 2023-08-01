function formatPlayerData(player, round, tournament_id) {
  if (round === 1)
    return {
      round,
      tournament_id,
      player_fide_id: player.fide_id,
      player_name: player.name,
      player_rating: player.rating,
      player_score: player.score || 0,
    }
  return {
    round,
    tournament_id,
    player_fide_id: player.player_fide_id,
    player_name: player.player_name,
    player_rating: player.player_rating,
    player_score: Number(player.player_score) + Number(player.result),
  }
}

function swissFirstRoundPairing(players, tournament_id) {
  // Initialize the pairings.
  const whitePlayers = []
  const blackPlayers = []

  // Sort the players by their ratings.
  players.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))

  // Pair the players off.
  const median = players.length / 2

  for (let i = 0; i < players.length / 2; i++) {
    if (i % 2 == 0) {
      whitePlayers.push(formatPlayerData(players[i], 1, tournament_id))
      blackPlayers.push(formatPlayerData(players[median + i], 1, tournament_id))
    } else {
      blackPlayers.push(formatPlayerData(players[i], 1, tournament_id))
      whitePlayers.push(formatPlayerData(players[median + i], 1, tournament_id))
    }
  }

  // Return the list of pairings.
  return { whitePlayers, blackPlayers }
}

// const firstRoundPairing = [
//   [
//     {
//       'No.': '1',
//       field2: '',
//       Name: 'Saurish, Kashelkar',
//       FideID: '33334277',
//       FED: 'IND',
//       rating: '1436',
//       score: 1,
//     },
//     {
//       'No.': '15',
//       field2: '',
//       Name: 'Gokhale, Ira',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '16',
//       field2: '',
//       Name: 'Hardikar, Kaustubh',
//       FideID: '88146804',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//     {
//       'No.': '2',
//       field2: '',
//       Name: 'Sawant, Siddhant',
//       FideID: '25609122',
//       FED: 'IND',
//       rating: '1429',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '3',
//       field2: '',
//       Name: 'Pethe, Varad',
//       FideID: '25635662',
//       FED: 'IND',
//       rating: '1352',
//       score: 1,
//     },
//     {
//       'No.': '17',
//       field2: '',
//       Name: 'Jadhav, Ayush',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '18',
//       field2: '',
//       Name: 'Jyotiraditya, Gadale',
//       FideID: '33485615',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//     {
//       'No.': '4',
//       field2: '',
//       Name: 'Gogate, Yash',
//       FideID: '46637885',
//       FED: 'IND',
//       rating: '1326',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '5',
//       field2: '',
//       Name: 'Rumde, Soham',
//       FideID: '46676341',
//       FED: 'IND',
//       rating: '1170',
//       score: 1,
//     },
//     {
//       'No.': '19',
//       field2: '',
//       Name: 'Kanitkar, Pushkar',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '20',
//       field2: '',
//       Name: 'Kanvinde, Ramaa',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//     {
//       'No.': '6',
//       field2: '',
//       Name: 'Bavdhane, Sahil Santosh',
//       FideID: '48784060',
//       FED: 'IND',
//       rating: '1110',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '7',
//       field2: '',
//       Name: 'Doiphode, Ved',
//       FideID: '48779482',
//       FED: 'IND',
//       rating: '1054',
//       score: 0,
//     },
//     {
//       'No.': '21',
//       field2: '',
//       Name: 'Kumbhare, Hrishikesh',
//       FideID: '33499110',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '22',
//       field2: '',
//       Name: 'Mayekar, Gargi',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//     {
//       'No.': '8',
//       field2: '',
//       Name: 'Apte, Sanavi',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '9',
//       field2: '',
//       Name: 'Aryash, Powar',
//       FideID: '33357773',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//     {
//       'No.': '23',
//       field2: '',
//       Name: 'Nidhee, Vinayak Mulye',
//       FideID: '33357862',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '24',
//       field2: '',
//       Name: 'Padhye, Raghav',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//     {
//       'No.': '10',
//       field2: '',
//       Name: 'Bhagwat, Anish',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '11',
//       field2: '',
//       Name: 'Bhide, Devashish',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//     {
//       'No.': '25',
//       field2: '',
//       Name: 'Sarjoshi, Rugved',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//   ],
//   [
//     {
//       'No.': '26',
//       field2: '',
//       Name: 'Sidhaye, Manas',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//     {
//       'No.': '12',
//       field2: '',
//       Name: 'Damle, Nandan',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '13',
//       field2: '',
//       Name: 'Dhulap, Aryan',
//       FideID: '33335109',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//     {
//       'No.': '27',
//       field2: '',
//       Name: 'Tikekar, Mohit',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
//   [
//     {
//       'No.': '28',
//       field2: '',
//       Name: 'Upparakakula, Jay',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 1,
//     },
//     {
//       'No.': '14',
//       field2: '',
//       Name: 'Gadale, Ovi',
//       FideID: '',
//       FED: 'IND',
//       rating: '0',
//       score: 0,
//     },
//   ],
// ]

function swissOtherRoundPairings(players, opponents, round, tournament_id) {
  // Initialize the pairings.
  const nextParing = []
  const whitePlayers = []
  const blackPlayers = []

  const points = [
    ...new Set([...players, ...opponents].map((i) => Number(i.player_score))),
  ].sort((a, b) => b - a)
  // Sort the players by their ratings.
  players.sort(
    (a, b) =>
      Number(b.player_score) - Number(a.player_score) ||
      a.player_name.localeCompare(b.player_name)
  )
  opponents.sort(
    (a, b) =>
      Number(b.player_score) - Number(a.player_score) ||
      a.player_name.localeCompare(b.player_name)
  )

  let tempPlayer = null
  let type = null
  // Pair the players off.
  points.forEach((score) => {
    const currentPlayers = players.filter(
      (ele) => Number(ele.player_score) === score
    )
    const currentOpponents = opponents.filter(
      (ele) => Number(ele.player_score) === score
    )

    const maxvalue = Math.max(currentOpponents.length, currentPlayers.length)
    // const minvalue = Math.min(currentOpponents.length, currentPlayers.length)

    const oMedian = Math.round(currentOpponents.length / 2)
    const pMedian = Math.round(currentPlayers.length / 2)

    for (let i = 0; i < Math.round(maxvalue / 2); i++) {
      if (tempPlayer && type) {
        const newPlayer = type === 'player' ? currentPlayers : currentOpponents
        nextParing.push([tempPlayer, newPlayer[i]])
        tempPlayer = null
        type = null
      }
      const remainingPlayers = currentPlayers.filter(
        (a) => !nextParing.flat().some((n) => n.id === a.id)
      )
      const remainingOpponent = currentOpponents.filter(
        (a) => !nextParing.flat().some((n) => n.id === a.id)
      )
      if (remainingPlayers.length === 1 || remainingOpponent.length === 1) {
        tempPlayer =
          remainingPlayers.length === 1
            ? remainingPlayers[0]
            : remainingOpponent[0]
        type = remainingPlayers.length === 1 ? 'player' : 'opponent'
      } else if (i >= oMedian || i >= pMedian) {
        const median = i >= oMedian ? pMedian : oMedian
        const newPlayers = i >= oMedian ? currentPlayers : currentOpponents
        if ((i >= oMedian && i % 2 == 0) || (i >= pMedian && i % 2 == 0)) {
          nextParing.push([newPlayers[i], newPlayers[median + i]])
        } else {
          nextParing.push([newPlayers[median + i], newPlayers[i]])
        }
      } else {
        nextParing.push([currentOpponents[oMedian + i], currentPlayers[i]])
        nextParing.push([currentOpponents[i], currentPlayers[pMedian + i]])
      }
    }
  })
  nextParing.forEach((p) => {
    whitePlayers.push(formatPlayerData(p[0], round, tournament_id))
    blackPlayers.push(formatPlayerData(p[1], round, tournament_id))
  })

  // Return the list of pairings.
  return { whitePlayers, blackPlayers }
}

module.exports = {
  swissFirstRoundPairing,
  swissOtherRoundPairings,
}
