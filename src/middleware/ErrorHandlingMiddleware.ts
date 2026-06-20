import { Request, Response, NextFunction } from 'express';
import logger from '@/winston/WinstonLogger';

export function errorHandlingMiddleware(error: unknown, req: Request, res: Response, next: NextFunction) {
    const statusCode = (error as any).statusCode || 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';

    logger.error('[Error Middleware] Caught error', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        statusCode
    });

    res.status(statusCode).json({
        status: 'error',
        message,
        statusCode
    });
}
