/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'max_participants',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'multiple_registration',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'default_category',
      {
        type: Sequelize.STRING,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'custom_message',
      {
        type: Sequelize.TEXT,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'description',
      {
        type: Sequelize.TEXT,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'max_participants',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'multiple_registration',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'default_category',
      {
        type: Sequelize.STRING,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'custom_message',
      {
        type: Sequelize.TEXT,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'description',
      {
        type: Sequelize.TEXT,
      }
    )
  },
}
