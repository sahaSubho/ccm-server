module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_tokens', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      token: {
        type: Sequelize.STRING,
      },
      user_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: 'users', key: 'id' },
      },
      type: {
        type: Sequelize.STRING,
      },
      blacklisted: {
        type: Sequelize.BOOLEAN,
      },
      expires: {
        allowNull: false,
        type: Sequelize.DATE,
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
    await queryInterface.dropTable('user_tokens')
  },
}
