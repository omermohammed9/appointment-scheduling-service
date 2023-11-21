import {Router} from "express";
import AppointmentController from "../controller/AppointmentController";
import AppDataSource from "../database/database";
import {validateIdMiddlewareRequest, validationDataMiddleware} from "../middleware/ValidationDataMiddleware";
import CreateAppointmentDTO from "../dto/CreateAppointmentDTO";
import {UpdateAppointmentDTO} from "../dto/UpdateAppointmentDTO";
import {errorHandlingMiddleware} from "../middleware/ErrorHandlingMiddleware";


const AppointmentRouter = Router();

const appointmentController = new AppointmentController(AppDataSource);

AppointmentRouter.get(`/getallappointments`, errorHandlingMiddleware, appointmentController.getAllAppointments.bind(appointmentController));
AppointmentRouter.get(`/getappointment/:id`, validateIdMiddlewareRequest, appointmentController.getAppoitmentById.bind(appointmentController));
AppointmentRouter.post(`/create`, validationDataMiddleware(CreateAppointmentDTO), appointmentController.createAppointment.bind(appointmentController));
AppointmentRouter.patch(`/updateappointment/:id`, validationDataMiddleware(UpdateAppointmentDTO), validateIdMiddlewareRequest, appointmentController.updateAppoitment.bind(appointmentController));
AppointmentRouter.delete(`/deleteappointment/:id`, validateIdMiddlewareRequest, appointmentController.deleteAppoitment.bind(appointmentController));
export default AppointmentRouter;