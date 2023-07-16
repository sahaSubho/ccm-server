function swissManager(players) {
  // Sort the players by their ratings.
  //   players.sort((a, b) => a.rating - b.rating)

  // Initialize the pairings.
  const pairings = []
  const indexes = []

  // Loop through the players.
  for (let i = 0; i < players.length; i++) {
    // Find a player of similar strength who has not been paired against the current player yet.
    indexes.push(i)
    const opponent = findOpponent(players, indexes, i)
    const index = players.indexOf(opponent)
    indexes.push(index)

    console.log('index..............', indexes, players[i], opponent)
    // Add the pairing to the list of pairings.
    if (opponent) {
      pairings.push([players[i]['No.'], opponent['No.']])
    }
    // players = players.filter((ele) => ![players[i], opponent].includes(ele))
  }

  // Return the list of pairings.
  return pairings
}

function findOpponent(players, indexes, currentPlayerIndex) {
  // Initialize the best opponent.
  let bestOpponent = null
  let bestScore = -Infinity

  // Loop through the players.
  for (let i = 0; i < players.length; i++) {
    // Skip the current player and players who have already been paired.

    if (i == currentPlayerIndex || indexes.includes(i)) {
      continue
    }

    // Calculate the score for the potential opponent.
    const score = players[i].rating - players[currentPlayerIndex].rating

    // If the score is better than the best score, update the best opponent.
    if (score > bestScore) {
      bestScore = score
      bestOpponent = players[i]
    }
  }

  // Return the best opponent.
  return bestOpponent
}

const players = [
  {
    'No.': '1',
    field2: '',
    Name: 'Saurish, Kashelkar',
    FideID: '33334277',
    FED: 'IND',
    rating: '1436',
  },
  {
    'No.': '2',
    field2: '',
    Name: 'Sawant, Siddhant',
    FideID: '25609122',
    FED: 'IND',
    rating: '1429',
  },
  {
    'No.': '3',
    field2: '',
    Name: 'Pethe, Varad',
    FideID: '25635662',
    FED: 'IND',
    rating: '1352',
  },
  {
    'No.': '4',
    field2: '',
    Name: 'Gogate, Yash',
    FideID: '46637885',
    FED: 'IND',
    rating: '1326',
  },
  {
    'No.': '5',
    field2: '',
    Name: 'Rumde, Soham',
    FideID: '46676341',
    FED: 'IND',
    rating: '1170',
  },
  {
    'No.': '6',
    field2: '',
    Name: 'Bavdhane, Sahil Santosh',
    FideID: '48784060',
    FED: 'IND',
    rating: '1110',
  },
  {
    'No.': '7',
    field2: '',
    Name: 'Doiphode, Ved',
    FideID: '48779482',
    FED: 'IND',
    rating: '1054',
  },
  {
    'No.': '8',
    field2: '',
    Name: 'Apte, Sanavi',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '9',
    field2: '',
    Name: 'Aryash, Powar',
    FideID: '33357773',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '10',
    field2: '',
    Name: 'Bhagwat, Anish',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '11',
    field2: '',
    Name: 'Bhide, Devashish',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '12',
    field2: '',
    Name: 'Damle, Nandan',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '13',
    field2: '',
    Name: 'Dhulap, Aryan',
    FideID: '33335109',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '14',
    field2: '',
    Name: 'Gadale, Ovi',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '15',
    field2: '',
    Name: 'Gokhale, Ira',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '16',
    field2: '',
    Name: 'Hardikar, Kaustubh',
    FideID: '88146804',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '17',
    field2: '',
    Name: 'Jadhav, Ayush',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '18',
    field2: '',
    Name: 'Jyotiraditya, Gadale',
    FideID: '33485615',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '19',
    field2: '',
    Name: 'Kanitkar, Pushkar',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '20',
    field2: '',
    Name: 'Kanvinde, Ramaa',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '21',
    field2: '',
    Name: 'Kumbhare, Hrishikesh',
    FideID: '33499110',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '22',
    field2: '',
    Name: 'Mayekar, Gargi',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '23',
    field2: '',
    Name: 'Nidhee, Vinayak Mulye',
    FideID: '33357862',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '24',
    field2: '',
    Name: 'Padhye, Raghav',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '25',
    field2: '',
    Name: 'Sarjoshi, Rugved',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '26',
    field2: '',
    Name: 'Sidhaye, Manas',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '27',
    field2: '',
    Name: 'Tikekar, Mohit',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
  {
    'No.': '28',
    field2: '',
    Name: 'Upparakakula, Jay',
    FideID: '',
    FED: 'IND',
    rating: '0',
  },
]

function swissSystemFirstRound(players) {
  // Initialize the pairings.
  const pairings = []

  // Sort the players by their ratings.
  players.sort((a, b) => b.rating - a.rating)

  // Pair the players off.
  const median = players.length / 2
  for (let i = 0; i < players.length / 2; i++) {
    if (i % 2 == 0) {
      pairings.push([players[i], players[median + i]])
    } else {
      pairings.push([players[median + i], players[i]])
    }
  }

  // Return the list of pairings.
  return pairings
}

const firstRoundPairing = [
  [
    {
      'No.': '1',
      field2: '',
      Name: 'Saurish, Kashelkar',
      FideID: '33334277',
      FED: 'IND',
      rating: '1436',
      score: 1,
    },
    {
      'No.': '15',
      field2: '',
      Name: 'Gokhale, Ira',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '16',
      field2: '',
      Name: 'Hardikar, Kaustubh',
      FideID: '88146804',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
    {
      'No.': '2',
      field2: '',
      Name: 'Sawant, Siddhant',
      FideID: '25609122',
      FED: 'IND',
      rating: '1429',
      score: 1,
    },
  ],
  [
    {
      'No.': '3',
      field2: '',
      Name: 'Pethe, Varad',
      FideID: '25635662',
      FED: 'IND',
      rating: '1352',
      score: 1,
    },
    {
      'No.': '17',
      field2: '',
      Name: 'Jadhav, Ayush',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '18',
      field2: '',
      Name: 'Jyotiraditya, Gadale',
      FideID: '33485615',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
    {
      'No.': '4',
      field2: '',
      Name: 'Gogate, Yash',
      FideID: '46637885',
      FED: 'IND',
      rating: '1326',
      score: 1,
    },
  ],
  [
    {
      'No.': '5',
      field2: '',
      Name: 'Rumde, Soham',
      FideID: '46676341',
      FED: 'IND',
      rating: '1170',
      score: 1,
    },
    {
      'No.': '19',
      field2: '',
      Name: 'Kanitkar, Pushkar',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '20',
      field2: '',
      Name: 'Kanvinde, Ramaa',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
    {
      'No.': '6',
      field2: '',
      Name: 'Bavdhane, Sahil Santosh',
      FideID: '48784060',
      FED: 'IND',
      rating: '1110',
      score: 1,
    },
  ],
  [
    {
      'No.': '7',
      field2: '',
      Name: 'Doiphode, Ved',
      FideID: '48779482',
      FED: 'IND',
      rating: '1054',
      score: 0,
    },
    {
      'No.': '21',
      field2: '',
      Name: 'Kumbhare, Hrishikesh',
      FideID: '33499110',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
  ],
  [
    {
      'No.': '22',
      field2: '',
      Name: 'Mayekar, Gargi',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
    {
      'No.': '8',
      field2: '',
      Name: 'Apte, Sanavi',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '9',
      field2: '',
      Name: 'Aryash, Powar',
      FideID: '33357773',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
    {
      'No.': '23',
      field2: '',
      Name: 'Nidhee, Vinayak Mulye',
      FideID: '33357862',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '24',
      field2: '',
      Name: 'Padhye, Raghav',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
    {
      'No.': '10',
      field2: '',
      Name: 'Bhagwat, Anish',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
  ],
  [
    {
      'No.': '11',
      field2: '',
      Name: 'Bhide, Devashish',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
    {
      'No.': '25',
      field2: '',
      Name: 'Sarjoshi, Rugved',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
  ],
  [
    {
      'No.': '26',
      field2: '',
      Name: 'Sidhaye, Manas',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
    {
      'No.': '12',
      field2: '',
      Name: 'Damle, Nandan',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '13',
      field2: '',
      Name: 'Dhulap, Aryan',
      FideID: '33335109',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
    {
      'No.': '27',
      field2: '',
      Name: 'Tikekar, Mohit',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
  [
    {
      'No.': '28',
      field2: '',
      Name: 'Upparakakula, Jay',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 1,
    },
    {
      'No.': '14',
      field2: '',
      Name: 'Gadale, Ovi',
      FideID: '',
      FED: 'IND',
      rating: '0',
      score: 0,
    },
  ],
]

function swissSystemOtherRounds(pairings) {
  // Initialize the pairings.
  const nextParing = []

  const players = pairings.map((ele) => ele[0])
  const opponents = pairings.map((ele) => ele[1])

  const points = [...new Set(pairings.flat().map((i) => i.score))]
  // Sort the players by their ratings.
  players.sort((a, b) => b.score - a.score || a['No.'] - b['No.'])
  opponents.sort((a, b) => b.score - a.score || a['No.'] - b['No.'])

  // Pair the players off.
  points.forEach((score) => {
    const currentPlayers = players.filter((ele) => ele.score === score)
    const currentOpponents = opponents.filter((ele) => ele.score === score)
    const maxvalue = Math.max(currentOpponents.length, currentPlayers.length)
    const minvalue = Math.min(currentOpponents.length, currentPlayers.length)
    const oMedian = currentOpponents.length / 2
    const pMedian = currentPlayers.length / 2

    if (score === 0) console.log(currentOpponents, currentPlayers)
    for (let i = 0; i < maxvalue / 2; i++) {
      console.log(i, oMedian, pMedian)
      if (i >= oMedian || i >= pMedian) {
        const median = i >= oMedian ? pMedian : oMedian
        const newPlayers = i >= oMedian ? currentPlayers : currentOpponents
        console.log(i, median, newPlayers[i], newPlayers[median + i])
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

  // Return the list of pairings.
  return nextParing
}

// console.log(players.length)
console.log(swissSystemOtherRounds(firstRoundPairing))
