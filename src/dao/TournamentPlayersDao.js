const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentPlayers = models.ccm_tournament_players

class TournamentPlayersDao extends SuperDao {
  constructor() {
    super(TournamentPlayers)
  }

  async findOne(where) {
    return TournamentPlayers.findOne({ where })
  }

  async remove(where) {
    return TournamentPlayers.destroy({ where })
  }
}

module.exports = TournamentPlayersDao
