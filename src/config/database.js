const config = require('./config')

console.log('DB Config: ', JSON.stringify(config))

module.exports = {
  development: {
    username: config.dbUser,
    password: config.dbPass,
    database: config.dbName,
    host: config.dbHost,
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
    },
    logging: false,
  },
  test: {
    username: config.dbUser,
    password: config.dbPass,
    database: config.dbName,
    host: config.dbHost,
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
    },
  },
  production: {
    username: config.dbUser,
    password: config.dbPass,
    database: config.dbName,
    host: config.dbHost,
    port: config.dbPort,
    dialect: 'postgres',
    dialectOptions: {
      bigNumberStrings: true,
    },
    pool: {
      min: 0,
      max: 5,
      acquireTimeoutMillis: 60000,
      idleTimeoutMillis: 600000,
    },
    logging: false,
  },
}
