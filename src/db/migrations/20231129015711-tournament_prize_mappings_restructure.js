/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Dropping irrelevant columns
    await queryInterface.removeColumn('tournament_prize_mappings', 'prize1')
    await queryInterface.removeColumn('tournament_prize_mappings', 'prize2')
    await queryInterface.removeColumn('tournament_prize_mappings', 'prize3')

    // Changing Column gender
    await queryInterface.changeColumn(
      'tournament_prize_mappings',
      'tournament_id',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
      }
    )
    await queryInterface.changeColumn(
      'tournament_prize_mappings',
      'category_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'prize_categories', key: 'id' },
      }
    )

    await queryInterface.addColumn('tournament_prize_mappings', 'prizes', {
      type: Sequelize.JSONB,
      allowNull: false,
    })
  },
}
