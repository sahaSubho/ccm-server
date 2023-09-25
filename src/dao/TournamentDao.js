const SuperDao = require('./SuperDao')
const models = require('../models')

const Tournament = models.cc_tournament_chessmasters
const Users = models.users

class TournamentDao extends SuperDao {
  constructor() {
    super(Tournament)
  }

  async findOneWithUser(id, attributes) {
    return Tournament.findOne({
      where: { id },
      include: {
        model: Users,
        attributes: attributes, // You can specify which user attributes to include
      },
    })
  }

  async remove(where) {
    return Tournament.destroy({ where })
  }
}

module.exports = TournamentDao
