import {Request, Response} from "express";
import {DataSource} from "typeorm";
import AppointmentRepository from "../repository/AppointmentRepository";
import AppointmentService from "../service/AppointmentService";
import {Controller, Delete, Get, Next, Patch, Post, Req, Res} from "@decorators/express";

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
            return res.status(201).json(newAppointment);

        }catch (err){
            next(err);
        }
    }

    @Get(`/getallappointments`)
    async getAllAppointments(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const Appointments = await this.appointmentService.findAllAppointments();
        return res.json(Appointments);
        }catch (err){
            next(err);
        }
    }
    @Get(`/getappointment/:id`)
    async getAppoitmentById(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const id = +req.params.id;
        const Appoitment = await this.appointmentService.findAppoitmentById(id);
        return res.json(Appoitment);
        }catch (err){
            next(err);
        }
    }
    @Patch(`/updateappointment/:id`)
    async updateAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const id = +req.params.id;
        const updateData = req.body;
        const Appointment = await this.appointmentService.updateAppoitment(id, updateData);
        return res.json(Appointment);
        }catch (err){
            next(err);
        }
    }
    @Delete(`/deleteappointment/:id`)
    async deleteAppoitment(@Req() req: Request, @Res() res: Response, @Next() next: Function) {
        try {
        const id = +req.params.id;
        const Appoitment = await this.appointmentService.deleteAppoitment(id);
        return res.json(Appoitment);
        }catch (err){
            next(err);
        }
    }
}


export default AppointmentController;