module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tournaments', {
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
      organizer: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      federation: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      director: {
        type: Sequelize.STRING,
      },
      arbiter: {
        type: Sequelize.STRING,
      },
      time_control: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tournament_type: {
        type: Sequelize.STRING,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      rating: { type: Sequelize.INTEGER },
      rounds: {
        type: Sequelize.INTEGER,
      },
      entry_fee: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      country: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      brochure: { type: Sequelize.STRING },
      display_pic: {
        type: Sequelize.STRING,
      },
      player_fide_ids: {
        type: Sequelize.STRING,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false },
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
    await queryInterface.dropTable('tournaments')
  },
}
