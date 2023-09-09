'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players', 'entry_fee_category', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('players', 'uuid', {
      type: Sequelize.INTEGER,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players', 'entry_fee_category')
    await queryInterface.removeColumn('players', 'uuid')
  },
}
