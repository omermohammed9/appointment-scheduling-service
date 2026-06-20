/**
 * Purpose: Singleton Redis subscriber client for listening to patient events.
 * Author Scope: Lead Software Engineer / System Architect
 * Dependencies: ioredis, WinstonLogger
 */

import Redis from 'ioredis';
import logger from '@/winston/WinstonLogger';

const redisSubscriber = new Redis({
  sentinels: [
    { host: process.env.REDIS_SENTINEL_HOST || 'localhost', port: parseInt(process.env.REDIS_SENTINEL_PORT || '26379') }
  ],
  name: 'mymaster',
  retryStrategy(times: number): number {
    const delay = Math.min(times * 200, 3000);
    logger.warn(`[Redis Subscriber] Retry #${times} in ${delay}ms`);
    return delay;
  },
  enableOfflineQueue: false,
  connectTimeout: 10000,
});

redisSubscriber.on('connect', () => logger.info('[Redis Subscriber] Connected to Sentinel'));
redisSubscriber.on('reconnecting', (ms: number) => logger.warn(`[Redis Subscriber] Reconnecting in ${ms}ms`));
redisSubscriber.on('error', (err: Error) => logger.error(`[Redis Subscriber] Error: ${err.message}`));

export default redisSubscriber;
