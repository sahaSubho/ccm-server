const SuperDao = require('./SuperDao')
const models = require('../models')

const PlayersPrizePayouts = models.players_prize_payouts

class PlayersPrizePayoutsDao extends SuperDao {
  constructor() {
    super(PlayersPrizePayouts)
  }

  async findOne(where) {
    return PlayersPrizePayouts.findOne({ where })
  }

  async remove(where) {
    return PlayersPrizePayouts.destroy({ where })
  }
}

module.exports = PlayersPrizePayoutsDao
