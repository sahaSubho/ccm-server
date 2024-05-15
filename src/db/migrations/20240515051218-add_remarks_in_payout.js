/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('payout_transactions', 'remarks', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('payout_transactions', 'remarks', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
  },
}
