const sequelize = require('sequelize')
const SuperDao = require('./SuperDao')
const models = require('../models')
const config = require('../config/config')

const TournamentPairings = models.temp_tournament_pairings
const Players = models.ccm_tournament_players

class TempTournamentPairingsDao extends SuperDao {
  constructor() {
    super(TournamentPairings)
  }

  async findOne(where) {
    return TournamentPairings.findOne({ where })
  }

  async remove(where) {
    return TournamentPairings.destroy({ where })
  }

  async findWithPlayers(where) {
    return TournamentPairings.findAll({
      where,
      order: [['id', 'asc']],
      include: {
        model: Players, // You can specify which user attributes to include
      },
      raw: true,
    })
  }

  async findCountByGroup(groupBy, column, where) {
    return TournamentPairings.findAll({
      attributes: [
        groupBy,
        [sequelize.fn('COUNT', sequelize.col(column)), 'count'],
      ],
      group: [groupBy],
      where,
      raw: true,
    })
  }

  async findSumByGroup(groupBy, column, where) {
    return TournamentPairings.findAll({
      attributes: [
        groupBy,
        [sequelize.fn('sum', sequelize.col(column)), 'sum'],
      ],
      group: [groupBy],
      where,
      raw: true,
    })
  }

  async findPairings(
    round,
    tournamentId,
    limit,
    offset,
    ongoing = false,
    search = ''
  ) {
    const where = {
      parent_id: null, // Only get top-level pairings
      round,
      tournament_id: tournamentId,
    }
    if (ongoing) {
      where.is_scored = false
    }
    if (search.length) {
      where[sequelize.Op.or] = [
        { player_name: { [sequelize.Op.iLike]: `%${search}%` } },
        { '$opponent.player_name$': { [sequelize.Op.iLike]: `%${search}%` } },
      ]
    }
    return TournamentPairings.findAndCountAll({
      where,
      include: [
        {
          model: Players,
          attributes: ['title'],
        },
        {
          model: TournamentPairings,
          as: 'opponent',
          required: false, // LEFT JOIN
          include: [
            {
              model: Players,
              attributes: ['title'],
            },
          ],
        },
      ],
      attributes: {
        include: [
          [sequelize.col('ccm_tournament_player.title'), 'player_title'],
        ],
      },
      order: [['id', 'asc']],
      limit,
      offset,
    })
  }
}

module.exports = TempTournamentPairingsDao
