import {Appointment} from '../entity/Appointment';
import {UpdateAppointmentDTO} from '../dto/UpdateAppointmentDTO';
import AppointmentRepository from "../repository/AppointmentRepository";
import CreateAppointmentDTO from "../dto/CreateAppointmentDTO";
import axios from "axios";
import {isDateTimeInFuture} from "../utils/DateUtils";

class AppointmentService {
    private appointmentRepository: AppointmentRepository;

    constructor(appointmentRepository: AppointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    async verifyPatientExists(patientId: number): Promise<boolean> {
        try {
            const response = await axios.get(`http://localhost:5000/patient/getpatientbyid/${patientId}`);
            return response.status === 200;
        } catch (error) {
            return false;
        }

    }

    async findAllAppointments(): Promise<Appointment[]> {
        console.log("Service:findAllAppointments");
        const Appointments = await this.appointmentRepository.findAllAppointments();
        console.log(`Appointments Service: Found ${Appointments.length} Appointments`);
        return Appointments;
    }

    async findAppoitmentById(id: number): Promise<Appointment | null> {
        return await this.appointmentRepository.findAppoitmentById({id});
    }


    async createAppointment(appointment: Omit<CreateAppointmentDTO, 'id'>, ): Promise<Appointment> {
        const patientExists = await this.verifyPatientExists(appointment.patientId);
        if (!patientExists) {
            throw new Error('Patient does not exist');
        }
        if (!isDateTimeInFuture(appointment.date, appointment.AppointmentTime || '00:00', appointment.timezone)) {
            throw new Error('Appointment time must be in the future.');
        }
        const isTaken = await this.appointmentRepository.isAppointmentSlotTaken(
            appointment.date,
            appointment.AppointmentTime || '00:00',
            appointment.duration
        );

        if (isTaken) {
            throw new Error('This appointment slot is already taken.');
        }
        return this.appointmentRepository.createAppointment(appointment);
    }

    async updateAppoitment(id: number, updateData: UpdateAppointmentDTO): Promise<Appointment | null> {
        const patientExists = await this.verifyPatientExists(updateData.patientId);
        if (!patientExists) {
            throw new Error('Patient does not exist');
        }
        return await this.appointmentRepository.updateAppointment(id, updateData);
    }

    async deleteAppoitment(id: number): Promise<Appointment | null> {
        return await this.appointmentRepository.deleteAppoitment(id);
    }
    // async updateAppointment(id: number, updateData: UpdateAppointmentDTO): Promise<Appointment | null> {
    //     const appointment = await this.appointmentRepository.findOne(id);
    //     if (!appointment) {
    //         return null;
    //     }
    //     Object.assign(appointment, updateData);
    //     await this.appointmentRepository.save(appointment);
    //     return appointment;
    // }
}

export default AppointmentService