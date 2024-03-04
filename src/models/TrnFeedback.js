const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class CCTournamentFeedback extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
  }
  CCTournamentFeedback.init(
    {
      tournament_key: {
        type: DataTypes.UUID,
      },
      question_text: DataTypes.STRING,
      question_type: {
        type: DataTypes.STRING,
        defaultValue: 'TEXT',
      },
      answer_options: DataTypes.STRING,
      is_mandatory: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      rank: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      flow_id: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      field_type: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      field_to_update: DataTypes.STRING,
      pincode_regex: DataTypes.STRING,
      validator_regex: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: 'cc_tournament_feedback',
      freezeTableName: true,
      timestamps: false,
    }
  )
  return CCTournamentFeedback
}
