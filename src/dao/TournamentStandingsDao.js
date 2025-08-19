const sequelize = require('sequelize')
const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentStandings = models.ccm_tournament_standings
const Players = models.ccm_tournament_players

class TournamentStandingsDao extends SuperDao {
  constructor() {
    super(TournamentStandings)
  }

  async findAndCountAll(
    round,
    tournamentId,
    limit,
    offset,
    search = '',
    version = 1
  ) {
    const where = {
      round,
      tournament_id: tournamentId,
      version,
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
      include: {
        model: Players, // You can specify which user attributes to include
        attributes: ['cc_userid'],
      },
      attributes: {
        include: [
          [sequelize.col('ccm_tournament_player.cc_userid'), 'cc_userid'],
        ],
      },
      raw: true,
    })
  }

  async findWithPlayer(where) {
    return TournamentStandings.findOne({
      where,
      order: [['rank', 'asc']],
      include: {
        model: Players, // You can specify which user attributes to include
      },
      raw: true,
    })
  }
}

module.exports = TournamentStandingsDao
