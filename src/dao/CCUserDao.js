const SuperDao = require('./SuperDao');
const models = require('../models');

const CCUser = models.CCUser;

class CCUserDao extends SuperDao {
  constructor() {
    super(CCUser);
  }

  // Find one CCUser record with the specified condition
  async findOne(where) {
    return CCUser.findOne({ where });
  }

  // Remove CCUser records matching the specified condition
  async remove(where) {
    return CCUser.destroy({ where });
  }
}

module.exports = CCUserDao;
