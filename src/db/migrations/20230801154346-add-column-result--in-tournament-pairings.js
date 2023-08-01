'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('tournament_pairings', 'player_score', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: '0.0',
    })
    await queryInterface.addColumn('tournament_pairings', 'result', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: '0.0',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tournament_pairings', 'result')
  },
}
