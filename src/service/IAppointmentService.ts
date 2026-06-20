import { Appointment } from '@/entity/Appointment';
import CreateAppointmentDTO from '@/dto/CreateAppointmentDTO';
import { UpdateAppointmentDTO } from '@/dto/UpdateAppointmentDTO';

export interface IAppointmentService {
    verifyPatientExists(patientId: number): Promise<boolean>;
    findAllAppointments(): Promise<Appointment[]>;
    findAppoitmentById(id: number): Promise<Appointment | null>;
    createAppointment(appointment: Omit<CreateAppointmentDTO, 'id'>): Promise<Appointment>;
    updateAppoitment(id: number, updateData: UpdateAppointmentDTO): Promise<Appointment | null>;
    deleteAppoitment(id: number): Promise<Appointment | null>;
}
