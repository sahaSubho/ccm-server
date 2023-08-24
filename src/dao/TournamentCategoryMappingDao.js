const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentCategoryMappings = models.tournament_prize_mapping

class TournamentPrizeCategoryMappingDao extends SuperDao {
  constructor() {
    super(TournamentCategoryMappings)
  }

  async findAllRaw(where) {
    return TournamentCategoryMappings.findAll({ where, raw: true })
  }

  async findAll(where) {
    return TournamentCategoryMappings.findAll({ where })
  }

  async findOne(where) {
    return TournamentCategoryMappings.findOne({ where })
  }

  async remove(where) {
    return TournamentCategoryMappings.destroy({ where })
  }
}

module.exports = TournamentPrizeCategoryMappingDao
