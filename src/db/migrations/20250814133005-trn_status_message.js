'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'status_message',
      {
        type: Sequelize.STRING,
        defaultValue: '',
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'status_message',
      {
        type: Sequelize.STRING,
        defaultValue: '',
      }
    )
  },
}
