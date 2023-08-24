const SuperDao = require('./SuperDao')
const models = require('../models')

const LichessProfile = models.LichessProfile

class LichessProfileDao extends SuperDao {
  constructor() {
    super(LichessProfile)
  }

  async findByLichessId(lichess_id) {
    return LichessProfile.findOne({ where: { lichess_id } })
  }
}

module.exports = LichessProfileDao
