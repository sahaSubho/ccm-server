const SuperDao = require('./SuperDao')
const models = require('../models')

const Tournament = models.tournaments

class TournamentDao extends SuperDao {
  constructor() {
    super(Tournament)
  }

  async findOne(where) {
    return Tournament.findOne({ where })
  }

  async remove(where) {
    return Tournament.destroy({ where })
  }
}

module.exports = TournamentDao
