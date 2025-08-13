'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ccm_tournament_standings', 'version', {
      type: Sequelize.INTEGER,
      enum: [0, 1],
      defaultValue: 1,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('ccm_tournament_standings', 'version', {
      type: Sequelize.INTEGER,
      enum: [0, 1],
      defaultValue: 1,
    })
  },
}
