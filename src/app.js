const express = require('express')
const cors = require('cors')
const fs = require('fs')
const passport = require('passport')
const httpStatus = require('http-status')
const routes = require('./route')
const { jwtStrategy } = require('./config/passport')
const { errorConverter, errorHandler } = require('./middlewares/error')
const check = require('./middlewares/apiKeyCheck')
const ApiError = require('./helper/ApiError')
const Sentry = require("@sentry/node")
const MonitoringHelper = require('./helper/monitoringHelper')
const ApiTracingMiddleware = require('./middlewares/api-tracing-middleware')

Sentry.init({
  dsn: "https://e555323ed5bcb7638b646c931192109e@o4507786239934464.ingest.us.sentry.io/4509535015534592",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
})



process.env.PWD = process.cwd()
const app = express()

// enable cors
app.use(cors())
app.use(
  cors({
    origin: '*',
  })
)
// app.options('*', cors())
const dest = 'uploads/'
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest)
}

app.use(express.static(`${process.env.PWD}/public`))
app.use('/uploads', express.static(`${process.env.PWD}/uploads`))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// jwt authentication
app.use(passport.initialize())
passport.use('jwt', jwtStrategy)

// Prometheus metrics middleware (default path: /metrics)
app.use(MonitoringHelper.getMetricsMiddleware())

// API tracing middleware for custom metrics
app.use(ApiTracingMiddleware)

app.get('/', async (req, res) => {
  res.status(200).send('Congratulations! API is working!')
})

// Prometheus metrics endpoint
app.get('/metrics', MonitoringHelper.getMetrics)

app.use('/api', check, routes)

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'))
})

// convert error to ApiError, if needed
app.use(errorConverter)
Sentry.setupExpressErrorHandler(app)
// handle error
app.use(errorHandler)
const db = require('./models')

// Uncomment this line if you want to sync database model
db.sequelize.sync()

module.exports = app
