'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'brochure_details',
      {
        type: Sequelize.JSONB,
        allowNull: true,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'brochure_details',
      {
        type: Sequelize.JSONB,
        allowNull: true,
      }
    )
  },
}
