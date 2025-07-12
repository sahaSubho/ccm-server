const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentStandings = models.ccm_tournament_standings

class TournamentStandingsDao extends SuperDao {
  constructor() {
    super(TournamentStandings)
  }
}

module.exports = TournamentStandingsDao
