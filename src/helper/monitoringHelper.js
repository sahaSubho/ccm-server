const promBundle = require('express-prom-bundle')
const logger = require('../config/logger')

/**
 * Normalize path for consistent metric labeling
 * @param {Object} req - Express request object
 * @returns {string} Normalized path
 */
function normalizePath(req) {
  let { path } = req

  // Replace numeric IDs with 'XXX' for consistent metrics
  path = path.replace(/\/\d+/g, '/XXX')

  // Replace UUIDs with 'XXX' for consistent metrics
  path = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/XXX'
  )

  return path
}

// Create prometheus middleware
const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  promClient: {
    collectDefaultMetrics: {
      timeout: 5000,
    },
  },
  normalizePath,
})

// Get environment from NODE_ENV
const environment = process.env.ENV === 'production' ? 'prod' : 'prepod'

// Custom metrics
const apiOpsCounter = new promBundle.promClient.Counter({
  name: 'api_operations_total',
  help: 'Total number of API operations',
  labelNames: ['api_name', 'method', 'path', 'service_name', 'env'],
})

const apiLatencyHistogram = new promBundle.promClient.Histogram({
  name: 'api_latency_seconds',
  help: 'API latency in seconds',
  labelNames: ['api_name', 'method', 'path', 'service_name', 'env'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
})

const apiResponseStatusCounter = new promBundle.promClient.Counter({
  name: 'api_response_status_total',
  help: 'Total number of API responses by status code',
  labelNames: [
    'api_name',
    'method',
    'path',
    'status_code',
    'service_name',
    'env',
  ],
})

/**
 * Get API name from request
 * @param {Object} request - Express request object
 * @returns {string} API name
 */
function getApiName(request) {
	let pathSplit = request.path.split('/');
	pathSplit = pathSplit.filter((value) => value).map((value) => (matchRegex(value) ? 'XXX' : value));
	const url = `${request.method}-${pathSplit.join('.')}`;
	return url;
}

function matchRegex(value) {
	const digitsRegex = new RegExp('^[0-9_]+$');
	const handIdRegex = new RegExp(/HH[A-Za-z0-9]+/g);
	const uuidRegex = new RegExp(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g);
	const tournamentIdRegex = new RegExp(/\d+_play$/);
	return digitsRegex.test(value) || handIdRegex.test(value) || uuidRegex.test(value) || tournamentIdRegex.test(value);
}

/**
 * Publish API operations metric
 * @param {string} apiName - Name of the API
 * @param {Object} request - Express request object (optional)
 */
function publishApiOps(apiName, request = null) {
  try {
    const labels = {
      api_name: apiName,
      service_name: 'cc-event',
      env: environment,
    }

    if (request) {
      labels.method = request.method
      labels.path = normalizePath(request)
    }

    apiOpsCounter.inc(labels)
    logger.info(`[Monitoring] Published API ops metric for: ${apiName}`)
  } catch (error) {
    logger.error(
      `[Monitoring] Error publishing API ops metric: ${error.message}`
    )
  }
}

/**
 * Publish API latency metric
 * @param {string} apiName - Name of the API
 * @param {number} startTime - Start time in milliseconds
 * @param {Object} request - Express request object (optional)
 */
function publishApiLatency(apiName, startTime, request = null) {
  try {
    const latency = (Date.now() - startTime) / 1000 // Convert to seconds
    const labels = {
      api_name: apiName,
      service_name: 'cc-event',
      env: environment,
    }

    if (request) {
      labels.method = request.method
      labels.path = normalizePath(request)
    }

    apiLatencyHistogram.observe(labels, latency)
    logger.info(
      `[Monitoring] Published API latency metric for: ${apiName}, latency: ${latency}s`
    )
  } catch (error) {
    logger.error(
      `[Monitoring] Error publishing API latency metric: ${error.message}`
    )
  }
}

/**
 * Publish API response status metric
 * @param {string} apiName - Name of the API
 * @param {number} statusCode - HTTP status code
 * @param {Object} request - Express request object (optional)
 */
function publishApiResponseStatus(apiName, statusCode, request = null) {
  try {
    const labels = {
      api_name: apiName,
      status_code: statusCode.toString(),
      service_name: 'cc-event',
      env: environment,
    }

    if (request) {
      labels.method = request.method
      labels.path = normalizePath(request)
    }

    apiResponseStatusCounter.inc(labels)
    logger.info(
      `[Monitoring] Published API response status metric for: ${apiName}, status: ${statusCode}`
    )
  } catch (error) {
    logger.error(
      `[Monitoring] Error publishing API response status metric: ${error.message}`
    )
  }
}

/**
 * Get metrics middleware for Express app
 * @returns {Function} Express middleware
 */
function getMetricsMiddleware() {
  return metricsMiddleware
}

/**
 * Get metrics endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function getMetrics(req, res) {
  try {
    res.set('Content-Type', promBundle.promClient.register.contentType)
    res.end(promBundle.promClient.register.metrics())
  } catch (error) {
    logger.error(`[Monitoring] Error getting metrics: ${error.message}`)
    res.status(500).send('Error getting metrics')
  }
}

module.exports = {
  publishApiOps,
  publishApiLatency,
  publishApiResponseStatus,
  getMetricsMiddleware,
  getMetrics,
  getApiName,
  normalizePath,
}
