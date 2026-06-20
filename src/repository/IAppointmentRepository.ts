import { Appointment } from '@/entity/Appointment';
import CreateAppointmentDTO from '@/dto/CreateAppointmentDTO';
import { UpdateAppointmentDTO } from '@/dto/UpdateAppointmentDTO';

export interface IAppointmentRepository {
    createAppointment(appointment: Omit<CreateAppointmentDTO, 'id'>): Promise<Appointment>;
    findAppoitmentById(criteria: Partial<Appointment>): Promise<Appointment | null>;
    findAllAppointments(): Promise<Appointment[]>;
    updateAppointment(id: number, updateData: UpdateAppointmentDTO): Promise<Appointment | null>;
    deleteAppoitment(id: number): Promise<Appointment | null>;
    isAppointmentSlotTaken(date: Date, time: string, duration: number, excludeAppointmentId?: number): Promise<boolean>;
}
