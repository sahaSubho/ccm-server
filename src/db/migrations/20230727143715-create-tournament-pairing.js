'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tournament_pairings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      round: {
        type: Sequelize.INTEGER,
      },
      parent_id: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
      },
      player_fide_id: {
        type: Sequelize.INTEGER,
      },
      player_name: {
        type: Sequelize.STRING,
      },
      player_rating: {
        type: Sequelize.INTEGER,
      },
      player_score: {
        type: Sequelize.DECIMAL,
        defaultValue: 0.0,
      },
      result: {
        type: Sequelize.DECIMAL,
        defaultValue: 0.0,
      },
      is_withdrawn: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tournament_pairings')
  },
}
