import {Request, Response} from "express";
import express from 'express';
import AppointmentRouter from './routes/appointmentRoutes';
import {errorHandlingMiddleware} from "./middleware/ErrorHandlingMiddleware";

const app = express();

app.use(express.json());

app.use('/appointments', AppointmentRouter);
app.use(errorHandlingMiddleware);

// Generic error handler (you can customize this)
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;
