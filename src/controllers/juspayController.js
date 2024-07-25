const httpStatus = require('http-status')
const JuspayService = require('../service/JuspayService')
const logger = require('../config/logger')

class JuspayController {
  constructor() {
    this.juspayService = new JuspayService()
  }

  orderStatus = async (req, res) => {
    try {
      const { id } = req.params
      const payout = await this.juspayService.orderStatus(id)
      const { status, message, data } = payout.response
      res.status(payout.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  getPayoutBalance = async (req, res) => {
    try {
      const payout = await this.juspayService.getPayoutBalance()
      const { status, message, data } = payout.response
      res.status(payout.statusCode).send({ status, message, data })
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }

  webhookTxnStatusUpdate = async (req, res) => {
    try {
      await this.juspayService.webhookTxnStatusUpdate(req.body)
      res.status(httpStatus.OK).send('Success')
    } catch (e) {
      logger.error(e)
      res.status(httpStatus.BAD_GATEWAY).send(e)
    }
  }
}

module.exports = JuspayController
