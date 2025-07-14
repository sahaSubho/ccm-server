const logger = require('../config/logger');
const MonitoringHelper = require('../helper/monitoringHelper');

function ApiTracingMiddleware(request, res, next) {
	if (request.url && request.url.includes('health')) {
		// Ignore health checks
		return next();
	}

	const startTime = Date.now();

	let apiName = 'unknown';

	try {
		apiName = MonitoringHelper.getApiName(request);
	} catch (error) {
		logger.error('[ApiTracingMiddleware] Error with getting Api Name', error);
	}

	// Publish API operations metric
	MonitoringHelper.publishApiOps(apiName, request);

	logger.info(request.body, `[Request] [${request.method}] [${request.url}]`);
	
	res.on('finish', () => {
		// Publish API latency metric
		MonitoringHelper.publishApiLatency(apiName, startTime, request);
		
		// Publish API response status metric
		MonitoringHelper.publishApiResponseStatus(apiName, res.statusCode, request);
		
		logger.info(
			`[Response] [${request.method}] [${request.url}] - ${res.statusCode} ${res.statusMessage}; ${res.get('Content-Length') || 0}b sent; latency: ${
				Date.now() - startTime
			}ms - ${JSON.stringify(res.body || {})}`,
		);
	});

	return next();
}

module.exports = ApiTracingMiddleware; 