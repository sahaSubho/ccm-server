/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
const runPairing = require('./runPairing')

function formatPlayerData(player, round = 1, tournament_id = undefined) {
  if (round === 1) {
    return {
      round,
      tournament_id,
      player_id: player.id,
      player_title: player.title || '',
      player_fide_id: player.fide_id || 0,
      player_name: player.name,
      player_rating: player.rating || 0,
      player_score: player.score || 0,
      cc_userid: player.cc_userid || 0,
    }
  }
  return {
    round,
    tournament_id,
    player_id: player.player_id,
    player_fide_id: player.player_fide_id || 0,
    player_name: player.player_name,
    player_rating: player.player_rating || 0,
    player_score: player.player_score,
    result: player.result,
    cc_userid: player.cc_userid || 0,
  }
}

const orderTitles = [
  'GM',
  'WGM',
  'IM',
  'WIM',
  'SG',
  'FM',
  'WFM',
  'AGM',
  'IGM',
  'DGM',
  'CM',
  'WCM',
  'AIM',
  'AFM',
  'ACM',
  'GCM',
]

const sortByInitialRankings = (players) => {
  return players.sort((a, b) => {
    if (b.rating === a.rating) {
      if (b?.title?.length && a?.title?.length) {
        return (
          orderTitles.indexOf(a.title.toUpperCase()) -
            orderTitles.indexOf(b.title.toUpperCase()) ||
          a.name?.localeCompare(b.name)
        )
      }
      if (b?.title?.length || a?.title?.length) {
        return b.title.length - a.title.length
      }
      return a.name?.localeCompare(b?.name)
    }
    return b.rating - a.rating
  })
}

// function swissFirstRoundPairing(players, tournament_id) {
//   // Initialize the pairings.
//   const whitePlayers = []
//   const blackPlayers = []

//   // Sort the players by their ratings.
//   players.sort((a, b) => {
//     return b.rating - a.rating || a.name.localeCompare(b.name)
//   })

//   // Pair the players off.
//   const median = players.length / 2

//   for (let i = 0; i < players.length / 2; i++) {
//     if (i % 2 == 0) {
//       if (players[i]) {
//         whitePlayers.push(formatPlayerData(players[i], 1, tournament_id))
//       }
//       if (players[median + i]) {
//         blackPlayers.push(
//           formatPlayerData(players[median + i], 1, tournament_id)
//         )
//       }
//     } else {
//       if (players[i]) {
//         blackPlayers.push(formatPlayerData(players[i], 1, tournament_id))
//       }
//       if (players[median + i]) {
//         whitePlayers.push(
//           formatPlayerData(players[median + i], 1, tournament_id)
//         )
//       }
//     }
//   }

//   // Return the list of pairings.
//   return { whitePlayers, blackPlayers }
// }

// function swissOtherRoundPairings(players, opponents, round, tournament_id) {
//   // Initialize the pairings.
//   const nextParing = []
//   const whitePlayers = []
//   const blackPlayers = []

//   console.log('count', players.length, opponents.length)

//   const points = [
//     ...new Set(
//       [...players, ...opponents].map((i) => {
//         return Number(i.player_score)
//       })
//     ),
//   ].sort((a, b) => {
//     return b - a
//   })
//   // Sort the players by their ratings.
//   console.log(points)
//   players.sort((a, b) => {
//     return (
//       Number(b.player_score) - Number(a.player_score) ||
//       b.player_rating - a.player_rating ||
//       a.player_name.localeCompare(b.player_name)
//     )
//   })
//   opponents.sort((a, b) => {
//     return (
//       Number(b.player_score) - Number(a.player_score) ||
//       a.player_name.localeCompare(b.player_name)
//     )
//   })

//   let tempPlayer = null
//   let ptype = null
//   const index = 0

//   // Pair the players off.
//   points.forEach((score) => {
//     const currentPlayers = players.filter((ele) => {
//       return Number(ele.player_score) === score
//     })
//     const currentOpponents = opponents.filter((ele) => {
//       return Number(ele.player_score) === score
//     })

//     // console.log(
//     //   'count........................',
//     //   currentPlayers.length,
//     //   currentOpponents.length
//     // )

//     if (tempPlayer && ptype) {
//       let player
//       if (ptype === 'players') {
//         player = currentOpponents.length
//           ? currentOpponents.shift()
//           : currentPlayers.shift()
//       } else {
//         player = currentPlayers.length
//           ? currentPlayers.shift()
//           : currentOpponents.shift()
//       }
//       // console.log('player', ptype, tempPlayer, player)
//       nextParing.push([tempPlayer, player])
//       tempPlayer = null
//       ptype = null
//     }

//     // console.log(
//     //   'count2........................',
//     //   currentPlayers.length,
//     //   currentOpponents.length
//     // )
//     const maxvalue = Math.max(currentOpponents.length, currentPlayers.length)
//     const minvalue = Math.min(currentOpponents.length, currentPlayers.length)

//     const oMedian = Math.round(currentOpponents.length / 2)
//     const pMedian = Math.round(currentPlayers.length / 2)

//     const data = {
//       playersA: [...currentPlayers].splice(0, pMedian), // [1,2,3,4]
//       playersB: [...currentPlayers].splice(pMedian), // [5,6,7]
//       opponentsA: [...currentOpponents].splice(0, oMedian), // [8,9,10,11,12]
//       opponentsB: [...currentOpponents].splice(oMedian), // [13,14,15,16]
//     }

//     // [[11,1],[8,5],[12,2],[9,6],[10,3]] => [4,7]
//     // [[11,1],[8,5],[12,2],[9,6],[13,3],[10,7]] => [4]
//     // [[12,1],[8,5],[13,2],[9,6],[14,3],[10,7],[15,4]] => [11]
//     // [[13,1],[8,5],[14,2],[9,6],[15,3],[10,7],[16,4]] => [11,12]
//     const distributionMapping = {
//       even: ['B', 'A'],
//       odd: ['A', 'B'],
//     }

//     // console.log('pairing..................', nextParing.length)

//     for (let index = 0; index < minvalue; index++) {
//       if (index % 2 === 0) {
//         const opp = !data.opponentsB.length ? data.opponentsA : data.opponentsB
//         nextParing.push([opp.shift(), data.playersA.shift()])
//       } else {
//         const pl = !data.playersB.length ? data.playersA : data.playersB
//         nextParing.push([data.opponentsA.shift(), pl.shift()])
//       }
//       // console.log(
//       //   'player',
//       //   JSON.stringify(data),
//       //   nextParing.length,
//       //   [...nextParing].slice(-1)
//       // )
//     }
//     if (maxvalue !== minvalue) {
//       const type = minvalue % 2 === 0 ? 'even' : 'odd'
//       const playersType =
//         maxvalue === currentPlayers.length ? 'players' : 'opponents'
//       const count = Math.min(
//         data[`${playersType}A`].length,
//         data[`${playersType}B`].length
//       )
//       if (
//         !count &&
//         Math.max(
//           data[`${playersType}A`].length,
//           data[`${playersType}B`].length
//         ) === 2
//       ) {
//         const item = !data[`${playersType}A`].length
//           ? data[`${playersType}B`]
//           : data[`${playersType}A`]
//         nextParing.push(item)
//       } else {
//         let j = 0
//         while (j < count) {
//           if (j % 2 === 0 || (j === 0 && type === 'even')) {
//             const item = distributionMapping.even.map((t) => {
//               return data[`${playersType}${t}`].shift()
//             })
//             nextParing.push(item)
//           } else if (j % 2 !== 0 || (j === 0 && type === 'odd')) {
//             const item = distributionMapping.odd.map((t) => {
//               return data[`${playersType}${t}`].shift()
//             })
//             nextParing.push(item)
//           }
//           j++
//         }
//         tempPlayer = data[`${playersType}A`].length
//           ? data[`${playersType}A`].shift()
//           : data[`${playersType}B`].shift()
//         ptype = playersType
//       }
//     }

//     // for (let i = 0; i <= Math.floor(maxvalue / 2); i++) {
//     //   const remainingPlayers = currentPlayers.filter(
//     //     (a) => !nextParing.flat().some((n) => n?.player_id === a.player_id)
//     //   )
//     //   const remainingOpponent = currentOpponents.filter(
//     //     (a) => !nextParing.flat().some((n) => n?.player_id === a.player_id)
//     //   )
//     //   if (remainingPlayers.length === 0 || remainingOpponent.length === 0) {
//     //     tempPlayer =
//     //       remainingPlayers.length > remainingOpponent.length
//     //         ? remainingPlayers[0]
//     //         : remainingOpponent[0]
//     //     type = remainingPlayers.length === 1 ? 'opponent' : 'player'
//     //     const median = type === 'opponent' ? oMedian : pMedian
//     //     index = i === median ? median + i : i
//     //   } else if (
//     //     i >= currentOpponents.length / 2 ||
//     //     i >= currentPlayers.length / 2
//     //   ) {
//     //     const median = i >= currentOpponents.length / 2 ? pMedian : oMedian
//     //     const newPlayers =
//     //       i >= currentOpponents.length / 2 ? currentPlayers : currentOpponents
//     //     const j = index ? median + index : i
//     //     if ((i >= oMedian && i % 2 == 0) || (i >= pMedian && i % 2 == 0)) {
//     //       nextParing.push([newPlayers[j], newPlayers[median + i]])
//     //     } else {
//     //       nextParing.push([newPlayers[median + i], newPlayers[j]])
//     //     }
//     //   } else {
//     //     nextParing.push([currentOpponents[oMedian + i], currentPlayers[i]])
//     //     nextParing.push([currentOpponents[i], currentPlayers[pMedian + i]])
//     //   }

//     //   if (tempPlayer && type) {
//     //     const newPlayer = type === 'player' ? currentPlayers : currentOpponents
//     //     nextParing.push([tempPlayer, newPlayer[index]])
//     //     tempPlayer = null
//     //     type = null
//     //   }
//     // }
//   })
//   // console.log('nextPairing', nextParing.length)

//   nextParing.forEach((p) => {
//     whitePlayers.push(formatPlayerData(p[0], round, tournament_id))
//     blackPlayers.push(formatPlayerData(p[1], round, tournament_id))
//   })

//   // Return the list of pairings.
//   return { whitePlayers, blackPlayers }
// }

async function javaFoRoundPairing(
  players,
  round,
  tournament,
  white,
  black,
  ranking,
  config,
  teams = []
) {
  const numberOfPlayers = players.length
  const tournamentDetails =
    `012  ${tournament.name}\n` +
    `042  ${tournament.start_date}\n` +
    `052  ${tournament.end_date}\n` +
    `062  ${numberOfPlayers}\n` +
    `092  ${tournament.pairing_type}: Swiss-System\n` +
    `XXR  ${tournament.rounds}\n`
  const data = white.concat(black).sort((a, b) => {
    return a.round - b.round
  })

  let stats = players
  if (teams.length > 0) {
    stats = teams
      .sort((a, b) => {
        return b.rating - a.rating
      })
      .reduce((a, b) => {
        const teamPlayers = players.filter((p) => {
          return b.player_uuids.includes(p.id)
        })
        let sortedPlayers = teamPlayers
        if (config.sorting) {
          sortedPlayers = sortByInitialRankings(teamPlayers)
        }
        a.push(...sortedPlayers)
        return a
      }, [])
  }

  const formatedPlayers = stats.map((p, i) => {
    return {
      ...formatPlayerData(p, 1, tournament.id),
      is_withdrawn: !!p.is_withdrawn,
      key: i + 1,
      round,
      player_score:
        data
          .filter((d) => {
            return d.player_id === p.id
          })
          .pop()?.player_score || 0,
    }
  })
  const matches = {}
  let ranks = {}
  stats.forEach((b, i) => {
    ranks[b.id] = i + 1
    matches[b.id] = []
  })
  const indexes = stats.reduce((a, b, i) => {
    a[b.id] = i + 1
    return a
  }, {})

  if (white.length && black.length) {
    ranks = ranking
    for (let index = 1; index < round; index++) {
      const whitePlayers = white.filter((p) => {
        return p.round === index
      })
      const blackPlayers = black.filter((p) => {
        return p.round === index
      })

      const count = Math.max(whitePlayers.length, blackPlayers.length)
      for (let i = 0; i < count; i++) {
        const player = whitePlayers[i]
        const opp = blackPlayers[i]
        if (player && !opp) {
          matches[player.player_id][index - 1] = `${''.padEnd(1, ' ')} - U`
        } else if (!player && opp) {
          matches[opp.player_id][index - 1] = `${''.padEnd(1, ' ')} - U`
        }
        // else if (player.is_withdrawn) {
        //   matches[opp.player_id][index - 1] = `0000 - Z`
        // } else if (opp.is_withdrawn) {
        //   matches[player.player_id][index - 1] = `0000 - Z`
        // }
        else if (String(player?.player_result)?.replace(/\s/g, '') === '---') {
          matches[player.player_id][index - 1] = `${indexes[opp.player_id]} w -`
          matches[opp.player_id][index - 1] = `${indexes[player.player_id]} b -`
        } else if (
          player?.player_result === '0.5-0.5'
        ) {
          matches[player.player_id][index - 1] = `${indexes[opp.player_id]} w =`
          matches[opp.player_id][index - 1] = `${indexes[player.player_id]} b =`
        } else {
          matches[player.player_id][index - 1] = `${indexes[opp.player_id]} w ${
            player?.player_result?.replace(/0.5/g,'=')[0]
          }`

          matches[opp.player_id][index - 1] = `${indexes[player.player_id]} b ${
            opp?.player_result?.replace(/0.5/g,'=')[2]
          }`
        }
      }
    }

    let maxRank = Math.max(...Object.values(ranks))
    formatedPlayers.forEach((p) => {
      if (!ranks[p.player_id]) {
        ranks[p.player_id] = ++maxRank
      }
    })
  }
  let result = tournamentDetails
  if (
    formatedPlayers.some((p) => {
      return p?.is_withdrawn
    })
  ) {
    result += `XXZ  ${formatedPlayers
      .filter((p) => {
        return p.is_withdrawn
      })
      .map((x) => {
        return x.key
      })
      .join(' ')}\n`
  }
  const teamPlayers = {}
  for (let i = 0; i < formatedPlayers.length; i += 1) {
    const p = formatedPlayers[i]
    // refer trf_format.txt file
    if (teams.length > 0) {
      const tp = teams.find((t) => {
        return t.player_uuids.includes(p.player_id)
      })
      if (tp) {
        teamPlayers[tp.name] = [...(teamPlayers[tp.name] || []), p.key]
      }
    }
    let ans =
      `001 ` +
      `${p.key.toString().padStart(4, ' ')}` +
      ` m${p?.player_title.padStart(3, ' ')} ` +
      `${p?.player_name?.slice(0, 33)?.padEnd(33, ' ')} ` +
      `${p?.player_rating?.toString()?.slice(0, 4)?.padStart(4, ' ')} ` +
      `${'IND'.padStart(3, ' ')} ` +
      `${p?.player_fide_id?.toString().slice(0, 11).padStart(11, ' ')} ` +
      `${''.padEnd(10, ' ')} ` +
      `${p?.player_score?.toFixed(1).padStart(4, ' ')} ` +
      `${ranks[p.player_id]?.toString().padStart(4, ' ')}`
    ;[...Array(round - 1).keys()]
      .map((x) => {
        return matches[p.player_id][x] || '0000 - Z'
      })
      ?.forEach((match) => {
        ans += `  ${match.padStart(8, ' ')}`
      })
    result += `${ans}\n`
  }
  if (teams.length > 0) {
    result += '\n'
    Object.keys(teamPlayers).forEach((tp) => {
      const ans = `013 ${tp.padStart(32, ' ')} ${teamPlayers[tp]
        .map((p) => {
          return p.toString().padStart(4, ' ')
        })
        .join(' ')}`
      result += `\n${ans}`
    })
  } else if (config.color !== 'random') {
    result += `XXC ${config.color}1`
  }
  const pairings = await runPairing(
    result,
    formatedPlayers,
    teams,
    `tournament_${tournament.id}_${round}`
  )
  return pairings
}

module.exports = {
  // swissFirstRoundPairing,
  // swissOtherRoundPairings,
  javaFoRoundPairing,
  sortByInitialRankings,
}
