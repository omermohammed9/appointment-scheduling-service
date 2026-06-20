import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { correlationLocalStorage } from '@/middleware/correlationId';

const addCorrelationId = winston.format((info) => {
    const correlationId = correlationLocalStorage.getStore();
    if (correlationId) {
        info.correlationId = correlationId;
    }
    return info;
});

const logFormat = winston.format.combine(
    addCorrelationId(),
    winston.format.timestamp(),
    winston.format.json()
);

const transports: winston.transport[] = [];

if (process.env.NODE_ENV === 'production') {
    transports.push(
        new DailyRotateFile({
            filename: 'logs/%DATE%-error.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error',
            format: logFormat
        })
    );
    transports.push(
        new DailyRotateFile({
            filename: 'logs/%DATE%-combined.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d',
            format: logFormat
        })
    );
    transports.push(
        new winston.transports.Console({
            format: logFormat
        })
    );
} else {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                addCorrelationId(),
                winston.format.timestamp(),
                winston.format.colorize(),
                winston.format.printf((info) => {
                    const cid = info.correlationId ? ` [cid: ${info.correlationId}]` : '';
                    return `${info.timestamp} ${info.level}: ${info.message}${cid}`;
                })
            )
        })
    );
}

const logger = winston.createLogger({
    level: 'info',
    defaultMeta: { service: 'appointment-scheduling-service' },
    transports,
});

export default logger;
