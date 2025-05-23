const SuperDao = require('./SuperDao')
const models = require('../models')

const PrizeCategories = models.prize_categories

class PrizeCategoryDao extends SuperDao {
  constructor() {
    super(PrizeCategories)
  }

  async findAllRaw(where) {
    return PrizeCategories.findAll({ where, raw: true })
  }

  async findAll(where) {
    return PrizeCategories.findAll({ where })
  }

  async findOne(where) {
    return PrizeCategories.findOne({ where })
  }

  async remove(where) {
    return PrizeCategories.destroy({ where })
  }
}

module.exports = PrizeCategoryDao
