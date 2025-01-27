/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // await queryInterface.addColumn('tournament_pairings', 'is_scored', {
    //   type: Sequelize.BOOLEAN,
    //   defaultValue: false,
    // })
    // await queryInterface.changeColumn('players', 'uuid', {
    //   type: Sequelize.STRING,
    //   unique: true,
    // })
    // await queryInterface.changeColumn('tournament_pairings', 'player_uuid', {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    //   references: {
    //     model: 'players',
    //     key: 'uuid',
    //   },
    // })
  },

  async down(queryInterface) {
    // await queryInterface.removeColumn('tournament_pairings', 'is_scored')
  },
}
