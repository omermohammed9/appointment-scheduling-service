import {Request, Response} from "express";
import express from 'express';
import AppointmentRouter from './routes/appointmentRoutes'; // Adjust the path as needed

const app = express();

// Body Parser Middleware to parse JSON bodies
app.use(express.json());

// Setup routes
app.use('/appointments', AppointmentRouter);

// Generic error handler (you can customize this)
app.use((err: Error, req: Request, res: Response, next: Function) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;
