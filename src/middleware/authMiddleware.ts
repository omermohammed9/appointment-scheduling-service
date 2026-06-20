import { Request, Response, NextFunction } from 'express';
import { V4 } from 'paseto';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // V4.local requires a 32-byte secret.
        const secret = process.env.PASETO_SECRET || '12345678901234567890123456789012';
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload = await (V4 as any).decrypt(token, secret);
        
        // Attach user context
        (req as any).user = payload;
        
        next();
    } catch (err) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid or expired token' });
    }
};
