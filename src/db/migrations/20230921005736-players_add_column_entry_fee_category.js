/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players', 'entry_fee_category', {
      type: Sequelize.STRING,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('players', 'entry_fee_category')
  },
}
