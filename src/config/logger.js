const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const config = require('./config')

const enumerateErrorFormat = winston.format((info) => {
  if (info.message instanceof Error) {
    info.message = {
      message: info.message.message,
      stack: info.message.stack,
      ...info.message,
    }
  }

  if (info instanceof Error) {
    return { message: info.message, stack: info.stack, ...info }
  }

  return info
})
const transport = new DailyRotateFile({
  filename: config.logConfig.logFolder + config.logConfig.logFile,
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '3',
  prepend: true,
})
transport.on('rotate', (oldFilename, newFilename) => {
  // call function like upload to s3 or on cloud
})

const logger = winston.createLogger({
  format: winston.format.combine(
    enumerateErrorFormat(), // Include custom error format
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Timestamp
    winston.format.errors({ stack: true }), // Include stack trace
    winston.format.json() // JSON for file transport
  ),
  transports: [
    transport,
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(
        enumerateErrorFormat(), // Reuse error formatter for console
        winston.format.colorize(), // Colorized console output
        winston.format.printf(({ timestamp, level, message, stack }) => {
          if (stack) {
            // Print stack trace for errors
            return `[${timestamp}] [${level}] ${message}\nStack: ${stack}`
          }
          return `[${timestamp}] [${level}] ${message}`
        })
      ),
    }),
  ],
})

console.log = (...args) => {
  return logger.info(args.join(' '))
}
console.error = (...args) => {
  return logger.error(args.join(' '))
}
console.warn = (...args) => {
  return logger.warn(args.join(' '))
}
console.debug = (...args) => {
  return logger.debug(args.join(' '))
}

module.exports = logger
