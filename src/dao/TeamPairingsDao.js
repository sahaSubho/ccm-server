const SuperDao = require('./SuperDao')
const models = require('../models')

const TeamPairings = models.ccm_team_pairings

class TeamPairingsDao extends SuperDao {
  constructor() {
    super(TeamPairings)
  }

  async findOne(where) {
    return TeamPairings.findOne({ where })
  }

  async remove(where) {
    return TeamPairings.destroy({ where })
  }
}

module.exports = TeamPairingsDao
