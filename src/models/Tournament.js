const { Model } = require('sequelize')
const config = require('../config/config')

module.exports = (sequelize, DataTypes) => {
  class Tournament extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Tournament.belongsTo(models.users, { foreignKey: 'created_by' })
      Tournament.hasMany(
        models[`${config.simulate ? 'temp_' : 'ccm_'}tournament_pairings`],
        {
          foreignKey: 'tournament_id',
        }
      )
      Tournament.hasMany(models.players_prize_payouts, {
        foreignKey: 'tournament_id',
      })
      Tournament.hasMany(models.tournament_prize_mappings, {
        foreignKey: 'tournament_id',
      })
      Tournament.hasMany(models.ccm_teams, {
        foreignKey: 'tournament_id',
      })
      Tournament.hasMany(models.ccm_team_pairings, {
        foreignKey: 'tournament_id',
      })
      Tournament.hasMany(
        models[
          `${config.simulate ? 'temp_' : ''}ccm_tournament_configurations`
        ],
        {
          foreignKey: 'tournament_id',
        }
      )
    }
  }

  Tournament.init(
    {
      name: DataTypes.STRING,
      organizer: DataTypes.STRING,
      federation: DataTypes.STRING,
      director: DataTypes.STRING,
      arbiter: DataTypes.STRING,
      time_control: DataTypes.STRING,
      tournament_type: DataTypes.STRING,
      start_date: DataTypes.DATE,
      end_date: DataTypes.DATE,
      reporting_time: DataTypes.TIME,
      meeting_time: DataTypes.TIME,
      rating: DataTypes.INTEGER,
      rounds: DataTypes.INTEGER,
      /*
      This is per category basis, needs to be
      moved to another table
      */
      entry_fee: DataTypes.JSONB,
      address: DataTypes.STRING,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      country: DataTypes.STRING,
      brochure: DataTypes.STRING,
      display_pic: DataTypes.STRING,
      category: DataTypes.STRING,
      player_fide_ids: {
        type: DataTypes.STRING(20000),
        allowNull: true,
      },
      withdrawn_uuid: {
        type: DataTypes.STRING(20000),
        allowNull: true,
      },
      current_round: DataTypes.INTEGER,
      /*
      Net cash inflow expected from the tournament
       */
      registration_inflow: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 100000,
      },
      brochure_details: DataTypes.JSONB,
      cct_id: DataTypes.INTEGER,
      created_by: DataTypes.INTEGER,
      is_active: DataTypes.BOOLEAN,
      order_id: DataTypes.STRING,
      previous_order_ids: DataTypes.JSONB,
      enable_registration: DataTypes.BOOLEAN,
      stakeholders_mobile_number: DataTypes.STRING,
      feedback_key: DataTypes.UUID,
      pairing_type: DataTypes.STRING,
      time_format: DataTypes.STRING,
      is_club_membership: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      association_level: DataTypes.STRING,
      association_name: DataTypes.STRING,
      association_membership_id_prefix: DataTypes.STRING,
      association_membership_duration: DataTypes.STRING,
      mandatory_club_membership_name: DataTypes.STRING,
      prize: DataTypes.STRING,
      is_private: DataTypes.BOOLEAN,
      csoc_batch: DataTypes.STRING,
      password: DataTypes.STRING,
      new_player_added: DataTypes.BOOLEAN,
      parent_id: DataTypes.INTEGER,
      whatsapp_group_link: DataTypes.STRING,
      max_participants: {
        type: DataTypes.INTEGER,
        defaultValue: -1,
      },
      multiple_registration: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      custom_message: DataTypes.TEXT,
      default_category: DataTypes.STRING,
      description: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: 'cc_tournament_chessmasters',
      underscored: true,
    }
  )

  return Tournament
}
