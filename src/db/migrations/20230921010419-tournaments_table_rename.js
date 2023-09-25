'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameTable(
      'tournaments',
      'cc_tournament_chessmasters'
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.renameTable(
      'cc_tournament_chessmasters',
      'tournaments'
    )
  },
}
