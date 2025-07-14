const SuperDao = require('./SuperDao')
const models = require('../models')

const PlayerStartingRank = models.ccm_players_starting_ranks
const TournamentPlayers = models.ccm_tournament_players

class PlayerStartingRankDao extends SuperDao {
  constructor() {
    super(PlayerStartingRank)
  }

  async findWithIncludes(where, limit = null, offset = null) {
    return PlayerStartingRank.findAll({
      where,
      include: [
        {
          model: TournamentPlayers,
          as: 'players',
        },
      ],
      order: [['rank', 'asc']],
      limit,
      offset,
      raw: true,
    })
  }
}

module.exports = PlayerStartingRankDao
