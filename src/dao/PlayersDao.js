const SuperDao = require('./SuperDao')
const models = require('../models')

const Players = models.players

console.log('Players model = ', Players)

class PlayersDao extends SuperDao {
  constructor() {
    super(Players)
  }

  async findOne(where) {
    return Players.findOne({ where })
  }

  async remove(where) {
    return Players.destroy({ where })
  }
}

module.exports = PlayersDao
