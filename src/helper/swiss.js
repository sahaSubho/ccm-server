const pair = require('./pairingEngine')

function formatPlayerData(player, round, tournament_id) {
  if (round === 1)
    return {
      round,
      tournament_id,
      player_uuid: player.uuid,
      player_fide_id: player.fide_id || 0,
      player_name: player.name,
      player_rating: player.rating || 0,
      player_score: player.score || 0,
    }
  return {
    round,
    tournament_id,
    player_uuid: player.player_uuid,
    player_fide_id: player.player_fide_id || 0,
    player_name: player.player_name,
    player_rating: player.player_rating || 0,
    player_score: Number(player.player_score),
    result: Number(player.result),
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

  console.log('count', players.length, opponents.length)

  const points = [
    ...new Set([...players, ...opponents].map((i) => Number(i.player_score))),
  ].sort((a, b) => b - a)
  // Sort the players by their ratings.
  console.log(points)
  players.sort(
    (a, b) =>
      Number(b.player_score) - Number(a.player_score) ||
      b.player_rating - a.player_rating ||
      a.player_name.localeCompare(b.player_name)
  )
  opponents.sort(
    (a, b) =>
      Number(b.player_score) - Number(a.player_score) ||
      a.player_name.localeCompare(b.player_name)
  )

  let tempPlayer = null
  let ptype = null
  let index = 0

  // Pair the players off.
  points.forEach((score) => {
    const currentPlayers = players.filter(
      (ele) => Number(ele.player_score) === score
    )
    const currentOpponents = opponents.filter(
      (ele) => Number(ele.player_score) === score
    )

    // console.log(
    //   'count........................',
    //   currentPlayers.length,
    //   currentOpponents.length
    // )

    if (tempPlayer && ptype) {
      let player
      if (ptype === 'players') {
        player = currentOpponents.length
          ? currentOpponents.shift()
          : currentPlayers.shift()
      } else {
        player = currentPlayers.length
          ? currentPlayers.shift()
          : currentOpponents.shift()
      }
      // console.log('player', ptype, tempPlayer, player)
      nextParing.push([tempPlayer, player])
      tempPlayer = null
      ptype = null
    }

    // console.log(
    //   'count2........................',
    //   currentPlayers.length,
    //   currentOpponents.length
    // )
    const maxvalue = Math.max(currentOpponents.length, currentPlayers.length)
    const minvalue = Math.min(currentOpponents.length, currentPlayers.length)

    const oMedian = Math.round(currentOpponents.length / 2)
    const pMedian = Math.round(currentPlayers.length / 2)

    const data = {
      playersA: [...currentPlayers].splice(0, pMedian), // [1,2,3,4]
      playersB: [...currentPlayers].splice(pMedian), // [5,6,7]
      opponentsA: [...currentOpponents].splice(0, oMedian), // [8,9,10,11,12]
      opponentsB: [...currentOpponents].splice(oMedian), // [13,14,15,16]
    }

    // [[11,1],[8,5],[12,2],[9,6],[10,3]] => [4,7]
    // [[11,1],[8,5],[12,2],[9,6],[13,3],[10,7]] => [4]
    // [[12,1],[8,5],[13,2],[9,6],[14,3],[10,7],[15,4]] => [11]
    // [[13,1],[8,5],[14,2],[9,6],[15,3],[10,7],[16,4]] => [11,12]
    const distributionMapping = {
      even: ['B', 'A'],
      odd: ['A', 'B'],
    }

    // console.log('pairing..................', nextParing.length)

    for (let index = 0; index < minvalue; index++) {
      if (index % 2 === 0) {
        const opp = !data.opponentsB.length ? data.opponentsA : data.opponentsB
        nextParing.push([opp.shift(), data.playersA.shift()])
      } else {
        const pl = !data.playersB.length ? data.playersA : data.playersB
        nextParing.push([data.opponentsA.shift(), pl.shift()])
      }
      // console.log(
      //   'player',
      //   JSON.stringify(data),
      //   nextParing.length,
      //   [...nextParing].slice(-1)
      // )
    }
    if (maxvalue !== minvalue) {
      const type = minvalue % 2 === 0 ? 'even' : 'odd'
      const playersType =
        maxvalue === currentPlayers.length ? 'players' : 'opponents'
      const count = Math.min(
        data[`${playersType}A`].length,
        data[`${playersType}B`].length
      )
      if (
        !count &&
        Math.max(
          data[`${playersType}A`].length,
          data[`${playersType}B`].length
        ) === 2
      ) {
        const item = !data[`${playersType}A`].length
          ? data[`${playersType}B`]
          : data[`${playersType}A`]
        nextParing.push(item)
      } else {
        let j = 0
        while (j < count) {
          if (j % 2 === 0 || (j === 0 && type === 'even')) {
            const item = distributionMapping['even'].map((t) =>
              data[`${playersType}${t}`].shift()
            )
            nextParing.push(item)
          } else if (j % 2 !== 0 || (j === 0 && type === 'odd')) {
            const item = distributionMapping['odd'].map((t) =>
              data[`${playersType}${t}`].shift()
            )
            nextParing.push(item)
          }
          j++
        }
        tempPlayer = data[`${playersType}A`].length
          ? data[`${playersType}A`].shift()
          : data[`${playersType}B`].shift()
        ptype = playersType
      }
    }

    // for (let i = 0; i <= Math.floor(maxvalue / 2); i++) {
    //   const remainingPlayers = currentPlayers.filter(
    //     (a) => !nextParing.flat().some((n) => n?.player_uuid === a.player_uuid)
    //   )
    //   const remainingOpponent = currentOpponents.filter(
    //     (a) => !nextParing.flat().some((n) => n?.player_uuid === a.player_uuid)
    //   )
    //   if (remainingPlayers.length === 0 || remainingOpponent.length === 0) {
    //     tempPlayer =
    //       remainingPlayers.length > remainingOpponent.length
    //         ? remainingPlayers[0]
    //         : remainingOpponent[0]
    //     type = remainingPlayers.length === 1 ? 'opponent' : 'player'
    //     const median = type === 'opponent' ? oMedian : pMedian
    //     index = i === median ? median + i : i
    //   } else if (
    //     i >= currentOpponents.length / 2 ||
    //     i >= currentPlayers.length / 2
    //   ) {
    //     const median = i >= currentOpponents.length / 2 ? pMedian : oMedian
    //     const newPlayers =
    //       i >= currentOpponents.length / 2 ? currentPlayers : currentOpponents
    //     const j = index ? median + index : i
    //     if ((i >= oMedian && i % 2 == 0) || (i >= pMedian && i % 2 == 0)) {
    //       nextParing.push([newPlayers[j], newPlayers[median + i]])
    //     } else {
    //       nextParing.push([newPlayers[median + i], newPlayers[j]])
    //     }
    //   } else {
    //     nextParing.push([currentOpponents[oMedian + i], currentPlayers[i]])
    //     nextParing.push([currentOpponents[i], currentPlayers[pMedian + i]])
    //   }

    //   if (tempPlayer && type) {
    //     const newPlayer = type === 'player' ? currentPlayers : currentOpponents
    //     nextParing.push([tempPlayer, newPlayer[index]])
    //     tempPlayer = null
    //     type = null
    //   }
    // }
  })
  // console.log('nextPairing', nextParing.length)

  nextParing.forEach((p) => {
    whitePlayers.push(formatPlayerData(p[0], round, tournament_id))
    blackPlayers.push(formatPlayerData(p[1], round, tournament_id))
  })

  // Return the list of pairings.
  return { whitePlayers, blackPlayers }
}

async function javaFoFirstRoundPairing(
  players,
  round,
  tournament,
  white = [],
  black = [],
  ranking
) {
  const numberOfPlayers = players.length
  const tournamentDetails =
    `012  ${tournament.name}\n` +
    `042  ${tournament.start_date}\n` +
    `052  ${tournament.end_date}\n` +
    `062  ${numberOfPlayers}\n` +
    `092  Individual: Swiss-System\n` +
    `XXR  ${tournament.rounds}\n`
  const lastRoundPlayers = white
    .concat(black)
    .filter((p) => p?.round === round - 1)
  const formatedPlayers = players.map((p, i) => ({
    ...formatPlayerData(p, 1, tournament.id),
    is_withdrawn: !!p.is_withdrawn,
    key: i + 1,
    round: round,
    player_score:
      lastRoundPlayers?.find((x) => x.player_uuid === p.uuid)?.player_score ||
      0,
  }))
  let stats = [...formatedPlayers]
  stats.sort((a, b) => {
    if (a.player_score === b.player_score) {
      if (b.player_rating === a.player_rating) {
        return a.player_name.localeCompare(b.player_name)
      }
      return b.player_rating - a.player_rating
    }
    return b.player_score - a.player_score
  })
  let matches = {}
  let ranks = {}
  stats.forEach((b, i) => {
    ranks[b.player_uuid] = i + 1
    matches[b.player_uuid] = []
  })
  let indexes = players
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
    .reduce((a, b, i) => {
      a[b.uuid] = i + 1
      return a
    }, {})
  if (white.length && black.length) {
    ranks = ranking
    for (let index = 1; index < round; index++) {
      const whitePlayers = white.filter((p) => p.round === index)
      const blackPlayers = black.filter((p) => p.round === index)

      const count = Math.max(whitePlayers.length, blackPlayers.length)
      for (let i = 0; i < count; i++) {
        const player = whitePlayers[i]
        const opp = blackPlayers[i]

        if (player && !opp) {
          matches[player.player_uuid][index - 1] = `${''.padEnd(1, ' ')} - U`
        } else if (!player && opp) {
          matches[opp.player_uuid][index - 1] = `${''.padEnd(1, ' ')} - U`
        } else if (player.is_withdrawn) {
          matches[opp.player_uuid][index - 1] = `0000 - Z`
        } else if (opp.is_withdrawn) {
          matches[player.player_uuid][index - 1] = `0000 - Z`
        } else if (
          Number(player.result) === 0.5 ||
          Number(opp.result) === 0.5
        ) {
          matches[player.player_uuid][index - 1] = `${
            indexes[opp.player_uuid]
          } w =`
          matches[opp.player_uuid][index - 1] = `${
            indexes[player.player_uuid]
          } b =`
        } else {
          matches[player.player_uuid][index - 1] = `${
            indexes[opp.player_uuid]
          } w ${Number(player.result)}`

          matches[opp.player_uuid][index - 1] = `${
            indexes[player.player_uuid]
          } b ${Number(opp.result)}`
        }
      }
    }

    let maxRank = Math.max(...Object.values(ranks))
    formatedPlayers.forEach((p) => {
      if (!ranks[p.player_uuid]) {
        ranks[p.player_uuid] = ++maxRank
      }
    })
  }
  let result = tournamentDetails
  let sorted = formatedPlayers
    .sort(
      (a, b) =>
        b.player_rating - a.player_rating ||
        a.player_name.localeCompare(b.player_name)
    )
    .map((e, i) => ({ ...e, key: i + 1 }))
  if (sorted.some((p) => p.is_withdrawn)) {
    result += `XXZ  ${sorted
      .filter((p) => p.is_withdrawn)
      .map((x) => x.key)
      .join(' ')}\n`
  }
  for (let i = 0; i < sorted.length; i++) {
    let p = sorted[i]
    // refer trf_format.txt file
    let ans =
      `001 ` +
      `${p.key.toString().padStart(4, ' ')}` +
      ` m${''.padStart(3, ' ')} ` +
      `${p?.player_name?.slice(0, 33)?.padEnd(33, ' ')} ` +
      `${p?.player_rating?.toString()?.slice(0, 4)?.padStart(4, ' ')} ` +
      `${'IND'.padStart(3, ' ')} ` +
      `${p?.player_fide_id?.toString().slice(0, 11).padStart(11, ' ')} ` +
      `${''.padEnd(10, ' ')} ` +
      `${p?.player_score?.toFixed(1).padStart(4, ' ')} ` +
      `${ranks[p.player_uuid]?.toString().padStart(4, ' ')}`
    ;[...Array(matches[p.player_uuid]?.length).keys()]
      .map((x) => matches[p.player_uuid][x] || '')
      ?.forEach((match) => {
        ans += `  ${match.padStart(8, ' ')}`
      })
    result += ans + `\n`
  }
  result += 'XXC white'
  const pairings = await pair(result, sorted)
  return pairings
}

module.exports = {
  swissFirstRoundPairing,
  swissOtherRoundPairings,
  javaFoFirstRoundPairing,
}
