'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tournaments', 'entry_fee')
    await queryInterface.addColumn('tournaments', 'entry_fee', {
      type: Sequelize.JSONB,
      allowNull: true,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tournaments', 'entry_fee', {
      type: Sequelize.JSONB, // Replace 255 with your desired VARCHAR length
      allowNull: true, // Modify this based on your column's nullability
    })
  },
}
