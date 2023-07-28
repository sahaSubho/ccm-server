'use strict'

const { userRoles } = require('../../config/constant')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('players', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
      },
      fide_id: {
        type: Sequelize.INTEGER,
        unique: true,
      },
      rating: {
        type: Sequelize.INTEGER,
      },
      created_by: {
        type: Sequelize.STRING,
        validate: {
          isIn: [[userRoles.ORGANIZER, 'self']],
        },
      },
      is_active: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true,
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
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('players')
  },
}
