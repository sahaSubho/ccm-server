/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('tournaments', 'player_fide_ids', {
      type: Sequelize.STRING(2000),
      allowNull: true,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('tournaments', 'player_fide_ids', {
      type: Sequelize.STRING(255), // Replace 255 with your desired VARCHAR length
      allowNull: true, // Modify this based on your column's nullability
    })
  },
}
