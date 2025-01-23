const SuperDao = require('./SuperDao')
const models = require('../models')

const Teams = models.ccm_teams

class TeamsDao extends SuperDao {
  constructor() {
    super(Teams)
  }

  async findOne(where) {
    return Teams.findOne({ where })
  }

  async remove(where) {
    return Teams.destroy({ where })
  }
}

module.exports = TeamsDao
