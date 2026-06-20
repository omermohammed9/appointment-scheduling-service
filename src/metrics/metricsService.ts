/**
 * Purpose: Prometheus metrics collection for Application Performance Monitoring.
 * Author Scope: Lead Software Engineer / System Architect
 * Dependencies: prom-client, express-basic-auth
 */

import client from 'prom-client';
import express from 'express';
import basicAuth from 'express-basic-auth';

const Registry = client.Registry;
export const register = new Registry();

// Add default metrics (CPU, Memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDurationMicroseconds);

export const dbQueryDurationMicroseconds = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of Database queries in seconds',
    labelNames: ['operation'],
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5]
});
register.registerMetric(dbQueryDurationMicroseconds);

export function metricsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const start = process.hrtime();
    res.on('finish', () => {
        const diff = process.hrtime(start);
        const time = diff[0] + diff[1] / 1e9;
        httpRequestDurationMicroseconds.labels(req.method, req.route ? req.route.path : req.path, res.statusCode.toString()).observe(time);
    });
    next();
}

export const metricsAuth = basicAuth({
    users: { [process.env.METRICS_USER || 'admin']: process.env.METRICS_PASS || 'admin' },
    challenge: true,
    unauthorizedResponse: 'Unauthorized to access metrics'
});
