/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ccm_tournament_players', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cc_tournament_chessmasters', // Name of the target model
          key: 'id'       // Key in the target model that we're referencing
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: {
        type: Sequelize.STRING
      },
      fide_id: {
        type: Sequelize.INTEGER
      },
      rating: {
        type: Sequelize.INTEGER
      },
      age: {
        type: Sequelize.INTEGER
      },
      gender: {
        type: Sequelize.STRING
      },
      mobile: {
        type: Sequelize.STRING
      },
      upi_id: {
        type: Sequelize.STRING
      },
      entry_fee_category: {
        type: Sequelize.STRING
      },
      is_withdrawn: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      registered_from : {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('ccm_tournament_players');
  }
};