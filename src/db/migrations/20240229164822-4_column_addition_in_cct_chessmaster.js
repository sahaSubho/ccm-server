/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'reporting_time',
      {
        type: Sequelize.TIME,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'meeting_time',
      {
        type: Sequelize.TIME,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'stakeholders_mobile_number',
      {
        type: Sequelize.STRING,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'feedback_key',
      {
        type: Sequelize.UUID,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'reporting_time',
      {
        type: Sequelize.TIME,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'meeting_time',
      {
        type: Sequelize.TIME,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'stakeholders_mobile_number',
      {
        type: Sequelize.STRING,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'feedback_key',
      {
        type: Sequelize.UUID,
      }
    )
  },
}
