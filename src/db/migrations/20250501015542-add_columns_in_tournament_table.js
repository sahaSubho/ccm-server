'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('cc_tournament_chessmasters', 'is_private', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'csoc_batch', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'password', {
      type: Sequelize.STRING,
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'is_private', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'csoc_batch', {
      type: Sequelize.STRING,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'password', {
      type: Sequelize.STRING,
    })
  }
};
