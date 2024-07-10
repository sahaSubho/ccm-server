/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'pairing_type',
      {
        type: Sequelize.STRING,
        defaultValue: 'Individual',
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'pairing_type',
      {
        type: Sequelize.STRING,
        defaultValue: 'Individual',
      }
    )
  },
}
