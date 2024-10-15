const fetch = require('node-fetch')
const httpStatus = require('http-status')
const responseHandler = require('../helper/responseHandler')
const logger = require('../config/logger')
const config = require('../config/config')
const PlayersPrizePayoutDao = require('../dao/PlayersPrizePayoutDao')
const PayoutTransactionsDao = require('../dao/PayoutTransactionsDao')
const TournamentDao = require('../dao/TournamentDao')
const RedisService = require('./RedisService')

class JuspayService {
  constructor() {
    this.authorization = Buffer.from(config.juspay.apiKey).toString('base64')
    this.url = config.juspay.url
    this.options = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.authorization}`,
        'x-merchantid': config.juspay.merchantId,
      },
    }

    this.redisService = new RedisService()

    this.playersPrizePayoutDao = new PlayersPrizePayoutDao()
    this.payoutTransactionsDao = new PayoutTransactionsDao()
    this.tournamentDao = new TournamentDao()
  }

  /**
   * Create access and refresh tokens
   * @param {Object} requestBody
   * @returns {boolean}
   */
  createPayout = async (requestBody) => {
    try {
      const url = `${this.url}merchant/v1/orders`
      this.options.method = 'POST'
      this.options.body = JSON.stringify(requestBody)
      const response = await fetch(url, this.options)
      const juspayResponse = await response.json()
      if (juspayResponse.error) {
        throw Error(juspayResponse.errorMessage)
      } else {
        const id = juspayResponse.fulfillments[0].id.split('-').shift()
        await this.redisService.setValue(id, juspayResponse.orderId)
        return juspayResponse
      }
    } catch (e) {
      throw Error(e.message)
    }
  }

  getPayoutBalance = async () => {
    try {
      const message = `Successfully fetched payout balance`
      const url = `${this.url}merchant/v1/getways/balance`
      this.options.method = 'GET'
      const response = await fetch(url, this.options)
      const juspayResponse = await response.json()
      if (juspayResponse.error) {
        return responseHandler.returnError(
          httpStatus.BAD_REQUEST,
          juspayResponse.errorMessage
        )
      } else {
        const balance = juspayResponse['YESBIZ_UPI'].balance || 0
        return responseHandler.returnSuccess(httpStatus.OK, message, balance)
      }
    } catch (error) {
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  orderStatus = async (orderId) => {
    try {
      const message = `Successfully fetched payout order status for ${orderId}`
      const url = `${this.url}merchant/v1/orders/${orderId}?expand=fulfillment`
      this.options.method = 'GET'
      const response = await fetch(url, this.options)
      const juspayResponse = await response.json()

      let data = []
      if (juspayResponse.status) {
        const payoutExists = await this.payoutTransactionsDao.checkExist({
          orderid: orderId,
        })
        const promises = []
        juspayResponse.fulfillments.forEach((txn) => {
          if (txn.transactions.length && txn.transactions[0].transactionRef) {
            const txnObj = txn.transactions[0]
            const obj = {
              id: txnObj.transactionRef,
              orderid: juspayResponse.orderId,
              status: txn.status,
              amount: txn.amount,
              responseMessage: txnObj.responseMessage || '',
              preferredMethodList: txn.preferredMethodList || '',
              fulfillmentMethod: txnObj.fulfillmentMethod || '',
              beneficiaryDetails: txn.beneficiaryDetails,
              fulfillmentId: txn.id,
            }
            data.push(obj)
            if (txn.id) {
              promises.push(
                this.playersPrizePayoutDao.updateWhere(
                  {
                    status: txn.status,
                    transaction_id: txnObj.transactionRef,
                  },
                  { fulfillment_id: txn.id }
                )
              )
            }
            if (payoutExists) {
              const updateData = { ...obj }
              delete updateData.id
              promises.push(
                this.payoutTransactionsDao.updateWhere(updateData, {
                  id: txnObj.transactionRef,
                })
              )
            }
          }
        })
        await Promise.allSettled(promises)

        if (!payoutExists && data.length) {
          await this.payoutTransactionsDao.bulkCreate(data)
        }
      }
      if (!data.length) {
        data = juspayResponse
      }
      return responseHandler.returnSuccess(httpStatus.OK, message, data)
    } catch (e) {
      logger.error(e)
      return responseHandler.returnError(
        httpStatus.BAD_REQUEST,
        'Something went wrong!'
      )
    }
  }

  webhookTxnStatusUpdate = async (txn) => {
    try {
      if (
        txn.label === 'FULFILLMENT_ORDER' &&
        ['SUCCESS', 'FAILURE', 'FAIL'].includes(txn.value)
      ) {
        const txnObj = txn.info
        let message = `Failed to process the aayment of ₹${txnObj.amount} to ${txnObj.beneficiaryDetails.details.name} upi address`
        if (txn.value === 'SUCCESS') {
          message = `Payment of ₹${txnObj.amount} has been processed successfully to ${txnObj.beneficiaryDetails.details.name} upi address`
        }
        global.io.emit('fulfillment_complete', {
          message,
          status: txn.value,
        })
        await this.payoutTransactionsDao.updateWhere(
          {
            beneficiaryDetails: txnObj.beneficiaryDetails,
            preferredMethodList: txnObj.preferredMethodList,
          },
          {
            fulfillmentId: txnObj.id,
          }
        )
      }
      if (txn.label === 'FULFILLMENT_TXN') {
        const txnObj = txn.info
        const id = txnObj.FulfillmentId.split('-').shift()
        const orderId = await this.redisService.getValue(id)
        const obj = {
          id: txnObj.transactionRef,
          orderid: orderId || '',
          status: txnObj.txnResponse.status || txnObj.status,
          responseMessage: txnObj.responseMessage || '',
          fulfillmentMethod: txnObj.fulfillmentMethod || '',
          amount: txnObj.amount,
          fulfillmentId: txnObj.FulfillmentId,
          beneficiaryDetails: '[{}]',
          preferredMethodList: '[{}]',
        }
        global.io.emit('status_update', {
          status: txnObj.txnResponse.status || txnObj.status,
          transactionId: txnObj.transactionRef,
          fulfillmentId: txnObj.FulfillmentId,
        })

        await this.playersPrizePayoutDao.updateWhere(
          {
            status: txnObj.txnResponse.status || txnObj.status,
            transaction_id: txnObj.transactionRef,
          },
          { fulfillment_id: txnObj.FulfillmentId }
        )
        if (txn.value === 'INITIATED') {
          await this.payoutTransactionsDao.create(obj)
        } else {
          await this.payoutTransactionsDao.updateWhere(obj, {
            id: txnObj.transactionRef,
          })
        }
      }
    } catch (e) {
      logger.error(e)
    }
  }
}

module.exports = JuspayService
