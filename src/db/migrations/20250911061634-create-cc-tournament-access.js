'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cc_tournament_access', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      access: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('now'),
      },
    })

    await queryInterface.addIndex(
      'cc_tournament_access',
      ['phone_number', 'tournament_id'],
      {
        name: 'idx_cc_tournament_access_phone_tournament',
        unique: true,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cc_tournament_access')
  },
}
