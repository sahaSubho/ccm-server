'use strict'
module.exports = (sequelize, DataTypes) => {
  const CCTournamentAccess = sequelize.define(
    'CCTournamentAccess',
    {
      phone_number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tournament_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      access: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'cc_tournament_access',
      underscored: true,
    }
  )

  CCTournamentAccess.associate = function (models) {
    if (models.CCTournament_ChessMaster) {
      CCTournamentAccess.belongsTo(models.CCTournament_ChessMaster, {
        foreignKey: 'tournament_id',
        as: 'tournament',
      })
    }
  }

  return CCTournamentAccess
}
