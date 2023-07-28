const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentPairings = models.tournament_pairings

class TournamentPairingsDao extends SuperDao {
  constructor() {
    super(TournamentPairings)
  }

  async findOne(where) {
    return TournamentPairings.findOne({ where })
  }

  async remove(where) {
    return TournamentPairings.destroy({ where })
  }
}

module.exports = TournamentPairingsDao
