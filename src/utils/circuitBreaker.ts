/**
 * Purpose: Reusable Circuit Breaker utility using opossum to protect Redis and DB connections.
 * Author Scope: Lead Software Engineer / System Architect
 * Dependencies: opossum, WinstonLogger
 */

import OpossumCircuitBreaker from 'opossum';
import { ServiceUnavailableError } from '@/utils/CustomErrors';
import logger from '@/winston/WinstonLogger';

const defaultOptions: OpossumCircuitBreaker.Options = {
  timeout: 5000, // 5 seconds timeout
  errorThresholdPercentage: 50, // Trip if 50% fail
  resetTimeout: 10000 // Try again after 10s
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  action: T,
  name: string,
  options?: OpossumCircuitBreaker.Options
): OpossumCircuitBreaker<Parameters<T>, ReturnType<T>> {
  const breaker = new OpossumCircuitBreaker<Parameters<T>, ReturnType<T>>(action, {
    ...defaultOptions,
    ...options
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  breaker.fallback(() => {
    logger.warn(`[CircuitBreaker] ${name} fallback executed. Service might be degraded.`);
    throw new ServiceUnavailableError(`${name} is currently unavailable due to repeated failures.`);
  });

  breaker.on('open', () => logger.warn(`[CircuitBreaker] ${name} opened!`));
  breaker.on('halfOpen', () => logger.info(`[CircuitBreaker] ${name} half-open, testing service...`));
  breaker.on('close', () => logger.info(`[CircuitBreaker] ${name} closed, service restored.`));

  return breaker;
}
