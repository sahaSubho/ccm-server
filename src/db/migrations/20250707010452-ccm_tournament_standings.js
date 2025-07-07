module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ccm_tournament_standings', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      rank: {
        type: Sequelize.INTEGER,
      },
      round: {
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
        type: Sequelize.STRING,
      },
      player_rating: {
        type: Sequelize.INTEGER,
      },
      point: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: '0.0',
      },
      tie_breaks: {
        type: Sequelize.JSONB,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ccm_tournament_standings')
  },
}
