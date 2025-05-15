/** @type {import('sequelize-cli').Migration} */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('temp_ccm_tournament_configuration', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'cc_tournament_chessmasters', // Name of the table
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tiebreaks: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      tiebreak_settings: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      sorting: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      sorting_type: {
        type: Sequelize.STRING,
        defaultValue: 'nat',
      },
      pairings: {
        type: Sequelize.STRING,
        defaultValue: '1,1/2,0',
      },
      bye_point: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 1.0,
      },
      color: {
        type: Sequelize.STRING,
        defaultValue: 'white',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    })
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('temp_ccm_tournament_configuration')
  },
}
