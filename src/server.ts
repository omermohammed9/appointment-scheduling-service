import {config} from "dotenv";
config({path: "./src/.env"});

import "reflect-metadata";
import { Request, Response } from 'express';
import app from '@/app'; // Adjust the path as needed
import AppDataSource from '@/database/database'; // Adjust the path as needed
import { startEventSubscriber } from '@/database/subscriberService';
import redisSubscriber from '@/redis/redisSubscriber';
import logger from '@/winston/WinstonLogger';
import { metricsMiddleware, metricsAuth, register } from "@/metrics/metricsService";
import { Server as SocketIOServer } from 'socket.io';

const PORT = process.env.PORT || 8000;
process.on('unhandledRejection', (reason, promise) => {
    logger.error('[Process] Unhandled Promise Rejection', {
        reason: String(reason),
        promise: String(promise),
    });
});

process.on('uncaughtException', (error) => {
    logger.error('[Process] Uncaught Exception — shutting down', {
        error: error.message,
        stack: error.stack,
    });
    process.exit(1);
});

let server: any;

// Initialize database connection
app.use(metricsMiddleware);

app.get('/metrics', metricsAuth, async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

AppDataSource.initialize()
    .then(() => {
        // Start the server once the database is connected
        server = app.listen(PORT, () => {
            logger.info(`[Appointment Scheduling Service] Started
  Port:     ${PORT}
  Database: ${AppDataSource.options.database} @ ${(AppDataSource.options as any).host || 'localhost'}:${(AppDataSource.options as any).port || '5432'}
  Redis:    ${process.env.REDIS_URL || 'redis://localhost:6379'}
  Env:      ${process.env.NODE_ENV || 'development'}`);
            startEventSubscriber();
        });

        // Initialize Socket.io
        const io = new SocketIOServer(server, {
            cors: {
                origin: "*", // Adjust to specific origin in production
                methods: ["GET", "POST"]
            }
        });

        // Store io globally so it can be accessed from the Service layer
        (global as any).io = io;

        io.on("connection", (socket) => {
            logger.info(`[Socket.io] Client connected: ${socket.id}`);

            // WebRTC Signaling
            socket.on("join-room", (roomId: string) => {
                socket.join(roomId);
                socket.to(roomId).emit("user-connected", socket.id);
            });

            socket.on("offer", (payload) => {
                io.to(payload.target).emit("offer", payload);
            });

            socket.on("answer", (payload) => {
                io.to(payload.target).emit("answer", payload);
            });

            socket.on("ice-candidate", (payload) => {
                io.to(payload.target).emit("ice-candidate", payload);
            });

            socket.on("disconnect", () => {
                logger.info(`[Socket.io] Client disconnected: ${socket.id}`);
            });
        });
    })
    .catch((error) => {
        logger.error('Database connection failed', { error: error.message, stack: error.stack });
    });

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[Server] ${signal} received. Starting graceful shutdown...`);

    if (server) {
        server.close(async () => {
            logger.info('[Server] HTTP server closed');

            try {
                // Close DB connection pool
                await AppDataSource.destroy();
                logger.info('[DB] Connection pool closed');

                // Disconnect Redis
                await redisSubscriber.quit();
                logger.info('[Redis] Client disconnected');

                logger.info('[Server] Graceful shutdown complete');
                process.exit(0);
            } catch (err) {
                logger.error('[Server] Error during shutdown:', err);
                process.exit(1);
            }
        });
    } else {
        process.exit(0);
    }

    // Force shutdown after 15s if drain takes too long
    setTimeout(() => {
        logger.error('[Server] Forced shutdown after timeout');
        process.exit(1);
    }, 15000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

