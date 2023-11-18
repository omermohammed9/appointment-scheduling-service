import {Router} from "express";
import AppointmentController from "../controller/AppointmentController";
import AppDataSource from "../database/database";


const AppointmentRouter = Router();

const appointmentController = new AppointmentController(AppDataSource);

AppointmentRouter.get(`/getallappointments`, appointmentController.getAllAppointments.bind(appointmentController));
AppointmentRouter.get(`/getappointment/:id`, appointmentController.getAppoitmentById.bind(appointmentController));
AppointmentRouter.post(`/create`, appointmentController.createAppointment.bind(appointmentController));
AppointmentRouter.patch(`/updateappointment/:id`, appointmentController.updateAppoitment.bind(appointmentController));
AppointmentRouter.delete(`/deleteappointment/:id`, appointmentController.deleteAppoitment.bind(appointmentController));
export default AppointmentRouter;