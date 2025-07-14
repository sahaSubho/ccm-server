const sequelize = require('sequelize')
const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentStandings = models.ccm_tournament_standings

class TournamentStandingsDao extends SuperDao {
  constructor() {
    super(TournamentStandings)
  }

  async findAndCountAll(round, tournamentId, limit, offset, search = '') {
    const where = {
      round,
      tournament_id: tournamentId,
    }
    if (search.length) {
      where[sequelize.Op.or] = [
        { player_name: { [sequelize.Op.iLike]: `%${search}%` } },
      ]
    }
    return TournamentStandings.findAndCountAll({
      where,
      limit,
      offset,
      order: [['rank', 'asc']],
      raw: true,
    })
  }
}

module.exports = TournamentStandingsDao
