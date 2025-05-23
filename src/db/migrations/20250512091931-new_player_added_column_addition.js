/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'new_player_added',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'new_player_added',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }
    )
  },
}
