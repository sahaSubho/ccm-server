/** @type {import('sequelize-cli').Migration} */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payout_transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.STRING,
      },
      orderId: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      amount: { type: Sequelize.INTEGER },
      responseMessage: {
        type: Sequelize.STRING,
      },
      preferredMethodList: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      fulfillmentMethod: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      beneficiaryDetails: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      fulfillmentId: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable('payout_transactions')
  },
}
