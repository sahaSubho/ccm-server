function calculateKFactor(
  playerRating,
  numberOfGamesPlayed,
  gamesWon,
  gamesLost
) {
  const MIN_K_FACTOR = 16 // Minimum K-factor to ensure some level of change
  const MAX_K_FACTOR = 32 // Maximum K-factor to limit extreme changes

  // Calculate player's performance rate (games won / total games played)
  const performanceRate = gamesWon / (gamesWon + gamesLost)

  // Base K-factor based on player's performance rate
  let kFactor = MIN_K_FACTOR + (MAX_K_FACTOR - MIN_K_FACTOR) * performanceRate

  // Adjust K-factor based on the number of games played
  if (numberOfGamesPlayed < 30) {
    kFactor *= 1.5 // Increase K-factor for players with fewer games
  } else if (numberOfGamesPlayed > 100) {
    kFactor *= 0.8 // Decrease K-factor for players with many games
  }

  // Limit K-factor within the specified range
  kFactor = Math.max(MIN_K_FACTOR, Math.min(MAX_K_FACTOR, kFactor))

  return kFactor
}

// Function to calculate Elo rating change for a single game
function calculateEloChange(playerRating, opponentRating, result, kFactor) {
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const actualScore = result
  const ratingChange = kFactor * (actualScore - expectedScore)
  return ratingChange
}

// Function to update player's rating after a round
function updateRating(playerRating, games) {
  const kFactor = calculateKFactor(
    playerRating,
    numberOfGamesPlayed,
    gamesWon,
    gamesLost
  )
  let totalRatingChange = 0

  for (const game of games) {
    const opponentRating = game.opponentRating
    const result = game.result

    const ratingChange = calculateEloChange(
      playerRating,
      opponentRating,
      result,
      kFactor
    )
    totalRatingChange += ratingChange
  }

  const newPlayerRating = playerRating + totalRatingChange
  return newPlayerRating
}
