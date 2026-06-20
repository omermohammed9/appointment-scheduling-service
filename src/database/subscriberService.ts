/**
 * Purpose: Subscriber service to listen for Redis events and sync the local PatientCache.
 * Author Scope: Lead Software Engineer / System Architect
 * Dependencies: AppDataSource, PatientCache, redisSubscriber, WinstonLogger
 */

import AppDataSource from '@/database/database';
import { DataSource } from 'typeorm';
import { PatientCache } from '@/entity/PatientCache';
/**
 * @file subscriberService.ts
 * @description Background daemon responsible for subscribing to the Redis 'patient_events' stream.
 * It listens for patient upsert and delete events from the Patient Management Service and 
 * synchronizes the local 'PatientCache' database table to ensure the Appointment Service 
 * can validate patient existence locally without synchronous HTTP calls.
 * @dependencies ioredis, TypeORM (PatientCache Repository), circuitBreaker, winston
 * @behavior
 * - Connects to Redis and creates a consumer group if it doesn't exist.
 * - Polls 'patient_events' stream using XREADGROUP.
 * - Upserts or deletes local PatientCache records based on event payload.
 * - Acknowledges (XACK) processed messages.
 * - Forwards unprocessable messages to a Dead Letter Queue (patient_events_dlq).
 */
import redisSubscriber from '@/redis/redisSubscriber';
import logger from '@/winston/WinstonLogger';
import { createCircuitBreaker } from '@/utils/circuitBreaker';
import { dbQueryDurationMicroseconds } from '@/metrics/metricsService';

/**
 * Starts the Redis subscription and sets up event handling for patient updates.
 */
export function startEventSubscriber(dataSource: DataSource = AppDataSource): void {
  const streamKey = 'patient_events';
  const groupName = 'appointment_service_group';
  const consumerName = 'consumer_1';

  async function initGroup() {
    try {
      await redisSubscriber.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
      logger.info('[Subscriber] Consumer group created or already exists');
    } catch (err: any) {
      if (!err.message.includes('BUSYGROUP')) {
        logger.error('[Subscriber] Error creating consumer group', { error: err.message });
      }
    }
  }

  async function poll() {
    try {
      const results = await redisSubscriber.xreadgroup(
        'GROUP', groupName, consumerName,
        'COUNT', 10,
        'BLOCK', 5000,
        'STREAMS', streamKey, '>'
      );

      if (results) {
        for (const [, messages] of results as any) {
          for (const messageObj of messages) {
            const [messageId, fields] = messageObj;
            
            const messageStr = fields[1]; 
            if (!messageStr) continue;

            const parsed = JSON.parse(messageStr) as { event: string; data: Record<string, unknown> };
            const { event, data } = parsed;

            if (data && data.id) {
              const cacheRepository = dataSource.getRepository(PatientCache);

              try {
                if (event === 'patient.upserted' && data.name) {
                  const stopTimer = dbQueryDurationMicroseconds.startTimer({ operation: 'save' });
                  const action = async () => cacheRepository.save({ id: data.id as number, name: data.name as string });
                  const breaker = createCircuitBreaker(action, 'CacheSavePatient');
                  await breaker.fire();
                  stopTimer();
                  logger.info('[Cache] Patient synced from Stream', { patientId: data.id, name: data.name });
                } else if (event === 'patient.deleted') {
                  const stopTimer = dbQueryDurationMicroseconds.startTimer({ operation: 'delete' });
                  const action = async () => cacheRepository.delete(data.id as number);
                  const breaker = createCircuitBreaker(action, 'CacheDeletePatient');
                  await breaker.fire();
                  stopTimer();
                  logger.info('[Cache] Patient removed from Stream', { patientId: data.id });
                }
                
                await redisSubscriber.xack(streamKey, groupName, messageId);
              } catch (processingError: unknown) {
                const message = processingError instanceof Error ? processingError.message : String(processingError);
                logger.error('[Redis] Error processing event', { 
                  messageId, 
                  error: message 
                });
                
                // Dead Letter Queue (DLQ)
                await redisSubscriber.xadd('patient_events_dlq', '*', 'failed_message', messageStr, 'error', message);
                
                // Acknowledge the original message so we don't get stuck in a loop
                await redisSubscriber.xack(streamKey, groupName, messageId);
              }
            } else {
              // Ack invalid messages too
              await redisSubscriber.xack(streamKey, groupName, messageId);
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Redis] Failed to initialize patient streams', { error: message });
    } finally {
      setTimeout(poll, 100);
    }
  }

  redisSubscriber.on('ready', async () => {
    logger.info('[Subscriber] Redis ready, starting stream poll');
    await initGroup();
    poll();
  });
}
