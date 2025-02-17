const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class CCUser extends Model {
    static associate(models) {
      // Define associations here
    }

    get displayName() {
      return this.getDisplayName();
    }
  }

  try {
    CCUser.init(
      {
        user_id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        user_key: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          unique: true,
        },
        mobile_email: {
          type: DataTypes.STRING,
          unique: true,
        },
        mobile_number: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        source: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        pincode: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        username: {
          type: DataTypes.STRING,
          unique: true,
          defaultValue: '',
        },
        cdc_name: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        lic_name: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        first_name: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        last_name: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        country: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        fide_id: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        user_type: {
          type: DataTypes.INTEGER,
          defaultValue: 1,
        },
        is_staff: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        enabled: {
          type: DataTypes.INTEGER,
          defaultValue: 1,
        },
        assessment_running: {
          type: DataTypes.STRING,
          defaultValue: '',
          allowNull: true,
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
        user_code: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        attempts_count_for_hint: {
          type: DataTypes.INTEGER,
          defaultValue: 3,
          allowNull: true,
        },
        default_puzzle_orientation: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: true,
        },
        default_time_class: {
          type: DataTypes.STRING,
          defaultValue: 'all',
          allowNull: true,
        },
        net_score: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: true,
        },
        active_subscription: {
          type: DataTypes.INTEGER,
          defaultValue: 1,
        },
        score_start_date: {
          type: DataTypes.STRING,
          defaultValue: '2022-01-01',
          allowNull: true,
        },
        current_view_user_id: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          allowNull: true,
        },
        learning_onboarding_status: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        report_enabled: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        seen_walkthroughs: {
          type: DataTypes.JSON,
          defaultValue: [],
        },
        custom_rules: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          defaultValue: [],
        },
        gameplay_rating: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
        k_value: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
        },
      },
      {
        sequelize,
        modelName: 'CCUser',
        tableName: 'cc_users',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        underscored: true,
      }
    );
  } catch (e) {
    console.error(e);
    throw e;
  }

  return CCUser;
};
