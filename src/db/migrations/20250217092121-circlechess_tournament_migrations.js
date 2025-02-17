'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Adding cc_userid column to ccm_tournament_players table
    await queryInterface.addColumn('ccm_tournament_players', 'cc_userid', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Adding cc_userid and cc_gameid columns to tournament_pairings table
    await queryInterface.addColumn('tournament_pairings', 'cc_userid', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    
    await queryInterface.addColumn('tournament_pairings', 'cc_gameid', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Removing columns in case of rollback
    await queryInterface.removeColumn('ccm_tournament_players', 'cc_userid');
    await queryInterface.removeColumn('tournament_pairings', 'cc_userid');
    await queryInterface.removeColumn('tournament_pairings', 'cc_gameid');
  }
};
