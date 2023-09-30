'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'current_round',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'withdrawn_uuid',
      {
        type: Sequelize.STRING(20000),
        allowNull: true,
      }
    )
    await queryInterface.changeColumn(
      'cc_tournament_chessmasters',
      'player_fide_ids',
      {
        type: Sequelize.STRING(20000),
        allowNull: true,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'current_round'
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'withdrawn_uuid'
    )
  },
}
