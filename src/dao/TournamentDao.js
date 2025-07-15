const SuperDao = require('./SuperDao')
const models = require('../models')

const Tournament = models.cc_tournament_chessmasters
const Users = models.users

class TournamentDao extends SuperDao {
  constructor() {
    super(Tournament)
  }

  async getAllFilteredTournaments(filter) {
    const where = {}

    // Add status if present
    if (filter.status) {
      where.status = filter.status
    }

    // Handle start_date = today
    if (filter.start_date === 'today') {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const startOfTomorrow = new Date(startOfToday)
      startOfTomorrow.setDate(startOfToday.getDate() + 1)

      where.start_date = {
        [Op.gte]: startOfToday,
        [Op.lt]: startOfTomorrow,
      }
    }
    console.log('Generated WHERE clause:', JSON.stringify(where, null, 2))

    // Add more filters as needed...

    return await Tournament.findAll({ where })
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
