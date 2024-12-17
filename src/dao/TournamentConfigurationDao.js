/* eslint-disable class-methods-use-this */
const SuperDao = require('./SuperDao')
const models = require('../models')

const TournamentConfiguration = models.ccm_tournament_configuration

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
