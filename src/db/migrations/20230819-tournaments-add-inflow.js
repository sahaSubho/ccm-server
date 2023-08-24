'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('tournaments', 'registration_inflow', {
      type: Sequelize.INTEGER,
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('tournaments', 'registration_inflow')
  }
};
