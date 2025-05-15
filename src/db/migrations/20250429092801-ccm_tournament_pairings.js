'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ccm_tournament_pairings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      round: {
        type: Sequelize.INTEGER
      },
      parent_id: {
        type: Sequelize.INTEGER
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cc_tournament_chessmasters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      player_fide_id: {
        type: Sequelize.INTEGER
      },
      player_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ccm_tournament_players',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'  // 👈 This is the important part: no CASCADE
      },
      player_name: {
        type: Sequelize.STRING
      },
      player_rating: {
        type: Sequelize.INTEGER
      },
      cc_userid: {
        type: Sequelize.INTEGER
      },
      cc_gameid: {
        type: Sequelize.STRING
      },
      player_score: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: '0.0'
      },
      result: {
        type: Sequelize.STRING,
        defaultValue: ''
      },
      is_scored: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_withdrawn: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_unpaired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ccm_tournament_pairings')
  }
}
