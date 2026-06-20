import {Request, Response} from "express";
import {DataSource} from "typeorm";
import AppointmentRepository from "@/repository/AppointmentRepository";
import AppointmentService from "@/service/AppointmentService";
import {Controller, Delete, Get, Next, Patch, Post, Req, Res} from "@decorators/express";
import sendResponse from "@/ResponseHelper/ResponseHelper";
import {validateIdMiddlewareRequest, validationDataMiddleware} from "@/middleware/ValidationDataMiddleware";
import CreateAppointmentDTO from "@/dto/CreateAppointmentDTO";
import {UpdateAppointmentDTO} from "@/dto/UpdateAppointmentDTO";

@Controller(`/appointment`)
class AppointmentController {
    private appointmentService: AppointmentService;

    constructor(dataSource: DataSource) {
        const appointmentRepository = new AppointmentRepository(dataSource);
        this.appointmentService = new AppointmentService(appointmentRepository);
    }


    @Post(`/create`, [validationDataMiddleware(CreateAppointmentDTO)])
    async createAppointment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const appointment = req.body;
        const newAppointment = await this.appointmentService.createAppointment(appointment);
            sendResponse(res, 201, newAppointment, 'Appointment created successfully');
            //return res.status(201).json(newAppointment);
        }catch (err){
            next(err);
        }
    }

    @Get(`/getallappointments`)
    async getAllAppointments(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const Appointments = await this.appointmentService.findAllAppointments();
        sendResponse(res, Appointments ? 200 : 404, Appointments, Appointments? ' ': 'No Appointments found');
        //return res.json(Appointments);
        }catch (err){
            next(err);
        }
    }
    @Get(`/getappointment/:id`, [validateIdMiddlewareRequest])
    async getAppoitmentById(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
            const Appoitment = await this.appointmentService.findAppoitmentById(req.validatedId);
            sendResponse( res, Appoitment ? 200 : 404, Appoitment, Appoitment? '': 'No Appointment found by this id');
        } catch (err){
            next(err);
        }
    }
    @Patch(`/updateappointment/:id`, [validateIdMiddlewareRequest, validationDataMiddleware(UpdateAppointmentDTO)])
    async updateAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
            const Appointment = await this.appointmentService.updateAppoitment(req.validatedId, req.body);
            sendResponse( res, Appointment ? 200 : 404, Appointment, Appointment? '': 'No Appointment found by this id to update');
        } catch (err) {
            next(err);
        }
    }
    @Delete(`/deleteappointment/:id`, [validateIdMiddlewareRequest])
    async deleteAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
            await this.appointmentService.deleteAppoitment(req.validatedId);
            sendResponse( res, 200, null,  'Appointment deleted successfully');
        } catch (err) {
            next(err);
        }
    }
}

export default AppointmentController;