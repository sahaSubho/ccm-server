/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('players', 'w_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.addColumn('players', 'o_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.addColumn('players', 'foa_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.addColumn('players', 'rapid_rating', {
      type: Sequelize.INTEGER,
    })

    await queryInterface.addColumn('players', 'blitz_rating', {
      type: Sequelize.INTEGER,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('players', 'w_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.removeColumn('players', 'o_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.removeColumn('players', 'foa_title', {
      type: Sequelize.STRING,
      defaultValue: '',
    })
    await queryInterface.removeColumn('players', 'rapid_rating', {
      type: Sequelize.INTEGER,
    })

    await queryInterface.removeColumn('players', 'blitz_rating', {
      type: Sequelize.INTEGER,
    })
  },
}
