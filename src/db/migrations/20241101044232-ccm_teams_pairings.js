/** @type {import('sequelize-cli').Migration} */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ccm_team_pairings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cc_tournament_chessmasters', // Name of the table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_id: {
        allowNull: true,
        type: Sequelize.INTEGER,
      },
      team_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ccm_teams', // Name of the table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      round: {
        type: Sequelize.INTEGER,
      },
      result: {
        type: Sequelize.STRING,
      },
      match_point: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
      game_point: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: '0.0',
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

  down: async (queryInterface) => {
    await queryInterface.dropTable('ccm_team_pairings')
  },
}
