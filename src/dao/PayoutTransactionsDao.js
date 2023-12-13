const SuperDao = require('./SuperDao')
const models = require('../models')

const PayoutTransactions = models.payout_transactions

class PayoutTransactionsDao extends SuperDao {
  constructor() {
    super(PayoutTransactions)
  }

  async findOne(where) {
    return PayoutTransactions.findOne({ where })
  }

  async remove(where) {
    return PayoutTransactions.destroy({ where })
  }
}

module.exports = PayoutTransactionsDao
