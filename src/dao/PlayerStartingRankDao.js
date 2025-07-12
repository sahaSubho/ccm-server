const SuperDao = require('./SuperDao')
const models = require('../models')

const PlayerStartingRank = models.ccm_players_starting_ranks
const TournamentPlayers = models.ccm_tournament_players

class PlayerStartingRankDao extends SuperDao {
  constructor() {
    super(PlayerStartingRank)
  }

  async findWithIncludes(where) {
    return PlayerStartingRank.findAll({
      where,
      include: [
        {
          model: TournamentPlayers,
          as: 'players',
        },
      ],
    })
  }
}

module.exports = PlayerStartingRankDao
