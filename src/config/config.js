const dotenv = require('dotenv')
const path = require('path')
const Joi = require('joi')

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envValidation = Joi.object()
  .keys({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .required(),
    PORT: Joi.number().default(3000),
    FILE_PATH: Joi.string(),
    API_KEY: Joi.string().required(),
    DB_HOST: Joi.string().default('localhost'),
    DB_USER: Joi.string().required(),
    DB_PASS: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(60 * 24)
      .description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    LOG_FOLDER: Joi.string().required(),
    LOG_FILE: Joi.string().required(),
    LOG_LEVEL: Joi.string().required(),
    REDIS_HOST: Joi.string().default('172.31.43.215'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_USE_PASSWORD: Joi.string().default('no'),
    REDIS_PASSWORD: Joi.string(),
    REDIS_HOST2: Joi.string().default('172.31.43.215'),
    REDIS_PORT2: Joi.number().default(6379),
    REDIS_USE_PASSWORD2: Joi.string().default('no'),
    REDIS_PASSWORD2: Joi.string(),
    JUSPAY_ENV: Joi.string(),
    JUSPAY_API_KEY: Joi.string(),
    JUSPAY_MERCHANT_ID: Joi.string(),
    PUBLISH_TRN_TO_CIRCLECHESS: Joi.bool().required(),
    CIRCLECHESS_API_URL: Joi.string().required(),
    GAME_SERVICE_API_URL: Joi.string(),
    SIMULATION_MODE: Joi.boolean(),
    CLUSTER_MODE_ENABLED: Joi.boolean().default(false),
    AWS_LAMBDA: Joi.string(),
  })
  .unknown()

const { value: envVar, error } = envValidation
  .prefs({ errors: { label: 'key' } })
  .validate(process.env)

if (error) {
  throw new Error(`Config validation error: ${error.message}`)
}

module.exports = {
  env: envVar.NODE_ENV,
  port: envVar.PORT,
  apiKey: envVar.API_KEY,
  XapiKey: envVar.X_API_KEY,
  filePath: envVar.FILE_PATH || `http://localhost:${envVar.PORT}/`,
  dbHost: envVar.DB_HOST,
  dbUser: envVar.DB_USER,
  dbPass: envVar.DB_PASS,
  dbName: envVar.DB_NAME,
  dbPort: envVar.DB_PORT,
  jwt: {
    secret: envVar.JWT_SECRET,
    accessExpirationMinutes: envVar.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVar.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes:
      envVar.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVar.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  logConfig: {
    logFolder: envVar.LOG_FOLDER,
    logFile: envVar.LOG_FILE,
    logLevel: envVar.LOG_LEVEL,
  },
  redis: {
    host: envVar.REDIS_HOST,
    port: envVar.REDIS_PORT,
    usePassword: envVar.REDIS_USE_PASSWORD,
    password: envVar.REDIS_PASSWORD,
    host2: envVar.REDIS_HOST2,
    port2: envVar.REDIS_PORT2,
    usePassword2: envVar.REDIS_USE_PASSWORD2,
    password2: envVar.REDIS_PASSWORD2,
  },
  cluster_mode_enabled: envVar.CLUSTER_MODE_ENABLED,
  juspay: {
    url:
      envVar.JUSPAY_ENV === 'production'
        ? 'https://api.juspay.in/payout/'
        : 'https://sandbox.juspay.in/payout/',
    apiKey: envVar.JUSPAY_API_KEY,
    merchantId: envVar.JUSPAY_MERCHANT_ID,
  },
  circlechess: {
    endpoint: envVar.CIRCLECHESS_API_URL,
    publish: envVar.PUBLISH_TRN_TO_CIRCLECHESS,
  },
  gameService: {
    endpoint: envVar.GAME_SERVICE_API_URL,
  },
  simulate: envVar.SIMULATION_MODE,
  awsLambdaUrl: envVar.AWS_LAMBDA,
}
