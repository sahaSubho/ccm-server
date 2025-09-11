const SuperDao = require('./SuperDao')
const models = require('../models')

const CCTournamentAccess = models.CCTournamentAccess

class CCTournamentAccessDao extends SuperDao {
  constructor() {
    super(CCTournamentAccess)
  }

  async findOne(where) {
    return CCTournamentAccess.findOne({ where })
  }

  async remove(where) {
    return CCTournamentAccess.destroy({ where })
  }
}

module.exports = CCTournamentAccessDao
