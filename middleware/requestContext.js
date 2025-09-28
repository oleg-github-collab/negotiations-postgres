import { v4 as uuidv4 } from 'uuid';
import { logPerformance } from '../utils/logger.js';

export function requestContext(req, res, next) {
  const requestId = uuidv4();
  const startTime = process.hrtime.bigint();

  req.context = {
    requestId,
    startTime,
  };

  res.setHeader('X-Request-ID', requestId);

  res.on('finish', () => {
    try {
      if (!req.context?.startTime) return;
      const duration = Number(process.hrtime.bigint() - req.context.startTime) / 1_000_000; // ms
      logPerformance('http_request', duration, {
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        contentLength: res.getHeader('Content-Length'),
      });
    } catch (error) {
      // Avoid crashing the request if logging fails
      console.error('Failed to log request performance', error);
    }
  });

  next();
}
