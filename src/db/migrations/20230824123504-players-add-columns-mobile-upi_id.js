'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players', 'mobile', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('players', 'upi_id', {
      type: Sequelize.STRING,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players', 'mobile')
    await queryInterface.removeColumn('players', 'upi_id')
  },
}
