const sequelize = require('sequelize')
const SuperDao = require('./SuperDao')
const models = require('../models')
const config = require('../config/config')

const TournamentPairings =
  models[`${config.simulate ? 'temp_' : 'ccm_'}tournament_pairings`]
const Players = models.ccm_tournament_players

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

  async findWithPlayers(where) {
    return TournamentPairings.findAll({
      where,
      order: [['id', 'asc']],
      include: {
        model: Players, // You can specify which user attributes to include
      },
      raw: true,
    })
  }

  async findCountByGroup(groupBy, column, where) {
    return TournamentPairings.findAll({
      attributes: [
        groupBy,
        [sequelize.fn('COUNT', sequelize.col(column)), 'count'],
      ],
      group: [groupBy],
      where,
      raw: true,
    })
  }

  async findSumByGroup(groupBy, column, where) {
    return TournamentPairings.findAll({
      attributes: [
        groupBy,
        [sequelize.fn('sum', sequelize.col(column)), 'sum'],
      ],
      group: [groupBy],
      where,
      raw: true,
    })
  }

  async findPairings(round, tournamentId, limit, offset) {
    return TournamentPairings.findAll({
      where: {
        parent_id: null, // Only get top-level pairings
        round,
        tournament_id: tournamentId,
      },
      include: [
        {
          model: TournamentPairings,
          as: 'opponent',
          required: false, // LEFT JOIN
        },
      ],
      order: [['id', 'asc']],
      limit,
      offset,
    })
  }
}

module.exports = TournamentPairingsDao
