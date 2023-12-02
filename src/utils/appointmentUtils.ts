import { Repository } from 'typeorm'; // Adjust import based on your ORM
import { Appointment } from '../entity/Appointment';
import moment from "moment"; // Adjust import based on your entity structure

export async function checkOverlappingAppointments(
    appointmentRepository: Repository<Appointment>,
    date: Date,
    startDateTime: moment.Moment,
    endDateTime: moment.Moment,
    excludeAppointmentId?: number
): Promise<number> {
    return appointmentRepository.createQueryBuilder('appointment')
        .where('appointment.date = :date', { date })
        .andWhere('appointment.id != :excludeAppointmentId', { excludeAppointmentId: excludeAppointmentId || 0 })
        .andWhere(`
            (CAST(appointment.date AS TIMESTAMP) + CAST(appointment.AppointmentTime AS TIME)) < :endDateTime AND
            (CAST(appointment.date AS TIMESTAMP) + CAST(appointment.AppointmentTime AS TIME) + appointment.duration * INTERVAL '1 hour') > :startDateTime
        `, {
            startDateTime: startDateTime.format('YYYY-MM-DD HH:mm:ss'),
            endDateTime: endDateTime.format('YYYY-MM-DD HH:mm:ss')
        })
        .getCount();
}
