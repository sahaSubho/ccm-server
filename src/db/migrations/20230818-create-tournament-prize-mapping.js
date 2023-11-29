module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tournament_prize_mappings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prize1: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prize2: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prize3: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tournament_prize_mappings')
  },
}
