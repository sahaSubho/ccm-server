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
    player_score: Number(player.player_score),
  }
}

function swissFirstRoundPairing(players, tournament_id) {
  // Initialize the pairings.
  const whitePlayers = []
  const blackPlayers = []

  // Sort the players by their ratings.
  players.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))

  console.log(players)

  // Pair the players off.
  const median = players.length / 2

  for (let i = 0; i < players.length / 2; i++) {
    if (i % 2 == 0) {
      if (players[i])
        whitePlayers.push(formatPlayerData(players[i], 1, tournament_id))
      if (players[median + i])
        blackPlayers.push(
          formatPlayerData(players[median + i], 1, tournament_id)
        )
    } else {
      if (players[i])
        blackPlayers.push(formatPlayerData(players[i], 1, tournament_id))
      if (players[median + i])
        whitePlayers.push(
          formatPlayerData(players[median + i], 1, tournament_id)
        )
    }
  }

  // Return the list of pairings.
  return { whitePlayers, blackPlayers }
}

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
  let index = 0

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

    const oMedian = Math.floor(currentOpponents.length / 2)
    const pMedian = Math.floor(currentPlayers.length / 2)

    for (let i = 0; i < Math.round(maxvalue / 2); i++) {
      const remainingPlayers = currentPlayers.filter(
        (a) => !nextParing.flat().some((n) => n?.id === a.id)
      )
      const remainingOpponent = currentOpponents.filter(
        (a) => !nextParing.flat().some((n) => n?.id === a.id)
      )
      if (remainingPlayers.length === 1 || remainingOpponent.length === 1) {
        tempPlayer =
          remainingPlayers.length === 1
            ? remainingPlayers[0]
            : remainingOpponent[0]
        type = remainingPlayers.length === 1 ? 'opponent' : 'player'
        const median = type === 'opponent' ? oMedian : pMedian
        index = i === median ? median + i : i
      } else if (
        i >= currentOpponents.length / 2 ||
        i >= currentPlayers.length / 2
      ) {
        const median = i >= currentOpponents.length / 2 ? pMedian : oMedian
        const newPlayers =
          i >= currentOpponents.length / 2 ? currentPlayers : currentOpponents
        const j = index ? median + index : i
        if ((i >= oMedian && i % 2 == 0) || (i >= pMedian && i % 2 == 0)) {
          nextParing.push([newPlayers[j], newPlayers[median + i]])
        } else {
          nextParing.push([newPlayers[median + i], newPlayers[j]])
        }
      } else {
        nextParing.push([currentOpponents[oMedian + i], currentPlayers[i]])
        nextParing.push([currentOpponents[i], currentPlayers[pMedian + i]])
      }

      if (tempPlayer && type) {
        const newPlayer = type === 'player' ? currentPlayers : currentOpponents
        nextParing.push([tempPlayer, newPlayer[index]])
        tempPlayer = null
        type = null
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
