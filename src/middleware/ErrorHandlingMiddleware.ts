import { Request, Response, NextFunction } from 'express';

export function errorHandlingMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
    console.error(error);
    res.status(500).send('An unexpected error occurred');
}
