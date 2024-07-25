const express = require('express')
const httpStatus = require('http-status')
const ApiError = require('../helper/ApiError')
const JuspayController = require('../controllers/juspayController')
const juspayValidator = require('../validator/juspayValidator')

const router = express.Router()
const auth = require('../middlewares/auth')

const juspayController = new JuspayController()

const authCheck = async (req, res, next) => {
  const validAuth = Buffer.from('juspaycc:JP_CircleChess@12').toString('base64')
  if (!req.headers.authorization) {
    return next(
      new ApiError(httpStatus.BAD_REQUEST, 'Please provide Basic Authorization')
    )
  }
  if (req.headers.authorization !== `Basic ${validAuth}`) {
    return next(
      new ApiError(
        httpStatus.BAD_REQUEST,
        'Please provide a valid Authorization'
      )
    )
  }
  return next()
}

router.post(
  '/payout_callback',
  authCheck,
  juspayController.webhookTxnStatusUpdate
)

router.get(
  '/status/:id',
  auth(),
  juspayValidator.payoutStatus,
  juspayController.orderStatus
)

router.get('/balance', auth(), juspayController.getPayoutBalance)

module.exports = router
