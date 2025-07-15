const SuperDao = require('./SuperDao')
const models = require('../models')

const Tournament = models.cc_tournament_chessmasters
const Users = models.users

class TournamentDao extends SuperDao {
  constructor() {
    super(Tournament)
  }

  async getAllFilteredTournaments(filter) {
    // Add more filters as needed...

    return await Tournament.findAll({ where: filter })
  }

  async findOneWithUser(id, attributes) {
    return Tournament.findOne({
      where: { id },
      include: {
        model: Users,
        attributes, // You can specify which user attributes to include
      },
    })
  }

  async remove(where) {
    return Tournament.destroy({ where })
  }

  async findOneWithIncludes(id) {
    return Tournament.findOne({
      where: { id },
      include: [
        {
          model: models.tournament_prize_mappings,
          as: 'prizes',
        },
        {
          model: models.users,
          as: 'user',
        },
      ],
    })
  }
}

module.exports = TournamentDao
