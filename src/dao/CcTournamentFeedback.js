const SuperDao = require('./SuperDao')
const models = require('../models')

const CCTournamentFeedback = models.cc_tournament_feedback

class CCTournamentFeedbackDao extends SuperDao {
  constructor() {
    super(CCTournamentFeedback)
  }

  async findOne(where) {
    return CCTournamentFeedback.findOne({ where })
  }

  async remove(where) {
    return CCTournamentFeedback.destroy({ where })
  }
}

module.exports = CCTournamentFeedbackDao
