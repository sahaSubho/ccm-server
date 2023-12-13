/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players_prize_payouts', 'email')

    await queryInterface.addColumn('players_prize_payouts', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn('players_prize_payouts', 'fulfillment_id', {
      type: Sequelize.STRING,
      allowNull: true,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players_prize_payouts', 'status')
    await queryInterface.removeColumn('players_prize_payouts', 'fulfillment_id')
    await queryInterface.addColumn('players_prize_payouts', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
    })
  },
}
