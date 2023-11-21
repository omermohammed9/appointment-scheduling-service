import {Request, Response} from "express";
import {DataSource} from "typeorm";
import AppointmentRepository from "../repository/AppointmentRepository";
import AppointmentService from "../service/AppointmentService";
import {Controller, Delete, Get, Next, Patch, Post, Req, Res} from "@decorators/express";
import sendResponse from "../ResponseHelper/ResponseHelper";
import {validateIdMiddlewareRequest} from "../middleware/ValidationDataMiddleware";

@Controller(`/appointment`)
class AppointmentController {
    private appointmentService: AppointmentService;

    constructor(dataSource: DataSource) {
        const appointmentRepository = new AppointmentRepository(dataSource);
        this.appointmentService = new AppointmentService(appointmentRepository);
    }


    @Post(`/create`)
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
        sendResponse( res, Appoitment ? 200 : 404, Appoitment, Appoitment? ' ': 'No Appoitment found by this id');
        return res.json(Appoitment);
        }catch (err){
            next(err);
        }
    }
    @Patch(`/updateappointment/:id`, [validateIdMiddlewareRequest])
    async updateAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const Appointment = await this.appointmentService.updateAppoitment(req.validatedId, req.body);
        sendResponse( res, Appointment ? 200 : 404, Appointment, Appointment? ' ': 'No Appoitment found by this id to update');
        return res.json(Appointment);
        }catch (err){
            next(err);
        }
    }
    @Delete(`/deleteappointment/:id`, [validateIdMiddlewareRequest])
    async deleteAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
             await this.appointmentService.deleteAppoitment(req.validatedId);
        sendResponse( res, 200, null,  'Appoitment deleted successfully');
        //return res.json(Appoitment);
        }catch (err: any) {
            if (err.message === 'Appoitment not found') {
                sendResponse(res, 404, null, err.message);
                //res.status(404).json({ message: err.message });
            } else {
                sendResponse(res, 500, null, err.message);
                //res.status(500).json({ message: err.message });
            }
        }
    }
}


export default AppointmentController;