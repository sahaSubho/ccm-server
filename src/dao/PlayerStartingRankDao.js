const SuperDao = require('./SuperDao')
const models = require('../models')

const PlayerStartingRank = models.ccm_players_starting_ranks

class PlayerStartingRankDao extends SuperDao {
  constructor() {
    super(PlayerStartingRank)
  }
}

module.exports = PlayerStartingRankDao
