'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ccm_tournament_configurations', 'engine', {
      type: Sequelize.STRING,
      enum: ['javafo', 'bbpPairing'],
      defaultValue: 'javafo',
    })
    await queryInterface.addColumn(
      'temp_ccm_tournament_configurations',
      'engine',
      {
        type: Sequelize.STRING,
        enum: ['javafo', 'bbpPairing'],
        defaultValue: 'javafo',
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'ccm_tournament_configurations',
      'engine',
      {
        type: Sequelize.STRING,
        enum: ['javafo', 'bbpPairing'],
        defaultValue: 'javafo',
      }
    )
    await queryInterface.removeColumn(
      'temp_ccm_tournament_configurations',
      'engine',
      {
        type: Sequelize.STRING,
        enum: ['javafo', 'bbpPairing'],
        defaultValue: 'javafo',
      }
    )
  },
}
