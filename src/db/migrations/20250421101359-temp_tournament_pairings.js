'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('temp_tournament_pairings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      round: {
        type: Sequelize.INTEGER,
      },
      parent_id: {
        type: Sequelize.INTEGER,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'cc_tournament_chessmasters',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION',
      },
      player_fide_id: {
        type: Sequelize.INTEGER,
      },
      player_uuid: {
        type: Sequelize.STRING(255),
      },
      player_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'ccm_tournament_players',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      player_name: {
        type: Sequelize.STRING(255),
      },
      player_rating: {
        type: Sequelize.INTEGER,
      },
      cc_userid: {
        type: Sequelize.INTEGER,
      },
      cc_gameid: {
        type: Sequelize.STRING(255),
      },
      player_score: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.0,
      },
      result: {
        type: Sequelize.STRING(255),
        defaultValue: '',
      },
      is_scored: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      is_withdrawn: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      is_unpaired: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('temp_tournament_pairings');
  },
};
