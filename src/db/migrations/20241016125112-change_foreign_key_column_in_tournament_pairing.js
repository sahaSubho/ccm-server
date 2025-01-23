module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Drop the existing foreign key constraint
    await queryInterface.changeColumn('tournament_pairings', 'player_uuid', {
      type: Sequelize.STRING,
      allowNull: true, // Set to true or false based on your requirements
    })

    await queryInterface.addColumn('tournament_pairings', 'player_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true or false based on your requirements
    })

    // Step 3: Add the new foreign key constraint
    await queryInterface.addConstraint('tournament_pairings', {
      fields: ['player_id'],
      type: 'foreign key',
      name: 'tournament_pairings_player_id_fkey', // Name of the new foreign key constraint
      references: {
        table: 'ccm_tournament_players', // Name of the referenced table
        field: 'id', // Name of the referenced column
      },
      onDelete: 'CASCADE', // Action on delete (optional)
      onUpdate: 'CASCADE', // Action on update (optional)
    })
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Drop the new foreign key constraint
    await queryInterface.removeConstraint(
      'tournament_pairings',
      'tournament_pairings_player_id_fkey'
    )

    await queryInterface.removeColumn('tournament_pairings', 'player_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Set to true or false based on your requirements
    })

    await queryInterface.changeColumn('tournament_pairings', 'player_uuid', {
      type: Sequelize.STRING,
      allowNull: false, // Set to true or false based on your requirements
    })
  },
}
