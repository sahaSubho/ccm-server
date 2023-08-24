module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * This table is the reference prize structure table with standard tournament prize categories
     */
    await queryInterface.createTable('prize_categories_refs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      age: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      age_operator: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      gender: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      gender_operator: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rating: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      rating_operator: {
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('prize_categories_refs')
  },
}
