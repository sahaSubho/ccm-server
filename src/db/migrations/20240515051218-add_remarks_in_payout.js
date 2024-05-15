/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players_prize_payouts', 'remarks', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players_prize_payouts', 'remarks', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
  },
}
