/* eslint-disable class-methods-use-this */
const SuperDao = require('./SuperDao')
const models = require('../models')
const config = require('../config/config')

const TournamentConfiguration = models[(config.simulate ? 'temp_' : '')+'ccm_tournament_configurations']

class TournamentConfigurationDao extends SuperDao {
  constructor() {
    super(TournamentConfiguration)
  }

  async findOne(where) {
    return TournamentConfiguration.findOne({ where })
  }

  async remove(where) {
    return TournamentConfiguration.destroy({ where })
  }
}

module.exports = TournamentConfigurationDao
