const SuperDao = require('./SuperDao')
const models = require('../models')
const sequelize = require('sequelize')

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

  async findCountByGroup(groupBy, column, where) {
    return TournamentPairings.findAll({
      attributes: [
        groupBy,
        [sequelize.fn('COUNT', sequelize.col(column)), 'count'],
      ],
      group: [groupBy],
      where: where,
      raw: true,
    })
  }
}

module.exports = TournamentPairingsDao
