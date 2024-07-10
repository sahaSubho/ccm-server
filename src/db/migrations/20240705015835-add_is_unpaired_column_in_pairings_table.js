/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tournament_pairings', 'is_unpaired', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })
    await queryInterface.changeColumn('tournament_pairings', 'result', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tournament_pairings', 'is_unpaired', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })
    await queryInterface.changeColumn('tournament_pairings', 'result', {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: '0.0',
    })
  },
}
