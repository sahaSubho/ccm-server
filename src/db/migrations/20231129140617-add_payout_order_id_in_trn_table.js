/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cc_tournament_chessmasters', 'order_id', {
      type: Sequelize.STRING,
      allowNull: true,
    })
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'previous_order_ids',
      {
        type: Sequelize.JSONB,
        allowNull: true,
      }
    )
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'order_id')
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'previous_order_ids'
    )
  },
}
