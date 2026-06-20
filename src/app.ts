import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import AppointmentRouter from '@/routes/appointmentRoutes';
import {errorHandlingMiddleware} from "@/middleware/ErrorHandlingMiddleware";
import { correlationIdMiddleware } from "@/middleware/correlationId";
import morgan from "morgan";
import logger from "@/winston/WinstonLogger";
import healthRouter from "@/routes/healthRoutes";
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

const app = express();

app.use(correlationIdMiddleware);
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: { write: message => logger.http(message.trim()) }
}));

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Appointment Scheduling Service API',
            version: '1.0.0',
            description: 'API Documentation for Appointment Scheduling Service',
        },
    },
    apis: ['./src/routes/*.ts', './src/controller/*.ts'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/health', healthRouter);
app.use('/appointments', AppointmentRouter);
app.use(errorHandlingMiddleware);

export default app;
