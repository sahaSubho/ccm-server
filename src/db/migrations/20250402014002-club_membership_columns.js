'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cc_tournament_chessmasters', 'is_club_membership', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'association_level', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'association_name', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'association_membership_id_prefix', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'association_membership_duration', {
      type: Sequelize.STRING,
    })
    await queryInterface.addColumn('cc_tournament_chessmasters', 'mandatory_club_membership_name', {
      type: Sequelize.STRING,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'is_club_membership', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'association_level', {
      type: Sequelize.STRING,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'association_name', {
      type: Sequelize.STRING,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'association_membership_id_prefix', {
      type: Sequelize.STRING,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'association_membership_duration', {
      type: Sequelize.STRING,
    })
    await queryInterface.removeColumn('cc_tournament_chessmasters', 'mandatory_club_membership_name', {
      type: Sequelize.STRING,
    })
  },
}