import { Router, Request, Response } from 'express';
import AppDataSource from '@/database/database';
import redisSubscriber from '@/redis/redisSubscriber';

const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
    const checks: Record<string, string> = {};
    let status = 'ok';

    try {
        await AppDataSource.query('SELECT 1');
        checks.database = 'ok';
    } catch (error) {
        checks.database = 'error';
        status = 'degraded';
    }

    try {
        await redisSubscriber.ping();
        checks.redis = 'ok';
    } catch (error) {
        checks.redis = 'error';
        status = 'degraded';
    }

    res.status(status === 'ok' ? 200 : 503).json({
        status,
        service: 'appointment-scheduling-service',
        timestamp: new Date().toISOString(),
        checks,
    });
});

export default healthRouter;
