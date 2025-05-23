/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cc_tournament_chessmasters', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    })
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'category_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.addColumn(
      'cc_tournament_chessmasters',
      'whatsapp_group_link',
      {
        type: Sequelize.STRING,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'parent_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'category_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
      }
    )
    await queryInterface.removeColumn(
      'cc_tournament_chessmasters',
      'whatsapp_group_link',
      {
        type: Sequelize.STRING,
      }
    )
  },
}
