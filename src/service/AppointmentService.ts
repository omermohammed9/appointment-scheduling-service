import {Appointment} from '@/entity/Appointment';
import {UpdateAppointmentDTO} from '@/dto/UpdateAppointmentDTO';
import AppointmentRepository from "@/repository/AppointmentRepository";
import CreateAppointmentDTO from "@/dto/CreateAppointmentDTO";
import {isDateTimeInFuture} from "@/utils/DateUtils";
import { PatientCache } from '@/entity/PatientCache';
import AppDataSource from '@/database/database';
import logger from '@/winston/WinstonLogger';
import { createCircuitBreaker } from '@/utils/circuitBreaker';
import { dbQueryDurationMicroseconds } from '@/metrics/metricsService';
import { NotFoundError, BadRequestError, ConflictError } from '@/utils/CustomErrors';
import { IAppointmentService } from '@/service/IAppointmentService';

class AppointmentService implements IAppointmentService {
    private appointmentRepository: AppointmentRepository;

    constructor(appointmentRepository: AppointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * Verifies if a patient exists in the local cache.
     * @param patientId Patient ID
     */
    async verifyPatientExists(patientId: number): Promise<boolean> {
        try {
            const cacheRepo = AppDataSource.getRepository(PatientCache);
            const stopTimer = dbQueryDurationMicroseconds.startTimer({ operation: 'findOneBy' });
            const action = async () => cacheRepo.findOneBy({ id: patientId });
            const breaker = createCircuitBreaker(action, 'CacheFindPatient');
            const cachedPatient = await breaker.fire();
            stopTimer();
            if (!cachedPatient) {
                logger.warn('Patient not in cache', { patientId });
            }
            return !!cachedPatient;
        } catch (error) {
            logger.error('Error reading patient cache', {
                patientId,
                error: (error as Error).message,
            });
            throw new Error('Database error checking patient registry.');
        }
    }

    /**
     * Finds all appointments.
     */
    async findAllAppointments(): Promise<Appointment[]> {
        logger.info("Service:findAllAppointments");
        const stopTimer = dbQueryDurationMicroseconds.startTimer({ operation: 'find' });
        const action = async () => this.appointmentRepository.findAllAppointments();
        const breaker = createCircuitBreaker(action, 'DatabaseFindAllAppointments');
        const Appointments = await breaker.fire();
        stopTimer();
        logger.info(`Appointments Service: Found ${Appointments.length} Appointments`);
        return Appointments;
    }

    /**
     * Finds an appointment by ID.
     */
    async findAppoitmentById(id: number): Promise<Appointment | null> {
        const stopTimer = dbQueryDurationMicroseconds.startTimer({ operation: 'findOneBy' });
        const action = async () => this.appointmentRepository.findAppoitmentById({id});
        const breaker = createCircuitBreaker(action, 'DatabaseFindAppointment');
        const result = await breaker.fire();
        stopTimer();
        return result;
    }

    /**
     * Creates a new appointment after verifying patient existence and slot availability.
     */
    async createAppointment(appointment: Omit<CreateAppointmentDTO, 'id'>): Promise<Appointment> {
        const patientExists = await this.verifyPatientExists(appointment.patientId);
        if (!patientExists) {
            throw new NotFoundError('Patient does not exist');
        }
        if (!isDateTimeInFuture(appointment.date, appointment.AppointmentTime || '00:00', appointment.timezone)) {
            throw new BadRequestError('Appointment time must be in the future.');
        }
        const stopTimerIsTaken = dbQueryDurationMicroseconds.startTimer({ operation: 'isAppointmentSlotTaken' });
        const actionIsTaken = async () => this.appointmentRepository.isAppointmentSlotTaken(
            appointment.date,
            appointment.AppointmentTime || '00:00',
            appointment.duration
        );
        const breakerIsTaken = createCircuitBreaker(actionIsTaken, 'DatabaseCheckSlot');
        const isTaken = await breakerIsTaken.fire();
        stopTimerIsTaken();

        if (isTaken) {
            throw new ConflictError('This appointment slot is already taken.');
        }
        const stopTimerCreate = dbQueryDurationMicroseconds.startTimer({ operation: 'save' });
        const actionCreate = async () => this.appointmentRepository.createAppointment(appointment);
        const breakerCreate = createCircuitBreaker(actionCreate, 'DatabaseCreateAppointment');
        const created = await breakerCreate.fire();
        stopTimerCreate();
        logger.info('Appointment created', { appointmentId: created.id, patientId: created.patientId });
        return created;
    }

    /**
     * Updates an appointment.
     */
    async updateAppoitment(id: number, updateData: UpdateAppointmentDTO): Promise<Appointment | null> {
        const stopTimerFind = dbQueryDurationMicroseconds.startTimer({ operation: 'findOneBy' });
        const actionFind = async () => this.appointmentRepository.findAppoitmentById({ id });
        const breakerFind = createCircuitBreaker(actionFind, 'DatabaseFindAppointment');
        const existing = await breakerFind.fire();
        stopTimerFind();
        if (!existing) {
            throw new NotFoundError('Appointment not found');
        }
        if (updateData.patientId !== undefined) {
            const patientExists = await this.verifyPatientExists(updateData.patientId);
            if (!patientExists) {
                throw new NotFoundError('Patient does not exist');
            }
        }
        
        // Merge the updates onto existing to validate overlap if changed
        const mergedDate = updateData.date !== undefined ? updateData.date : existing.date;
        const mergedTime = updateData.AppointmentTime !== undefined ? updateData.AppointmentTime : existing.AppointmentTime;
        const mergedDuration = updateData.duration !== undefined ? updateData.duration : existing.duration;

        if (updateData.date !== undefined || updateData.AppointmentTime !== undefined || updateData.duration !== undefined) {
            const stopTimerIsTaken = dbQueryDurationMicroseconds.startTimer({ operation: 'isAppointmentSlotTaken' });
            const actionIsTaken = async () => this.appointmentRepository.isAppointmentSlotTaken(
                mergedDate,
                mergedTime || '00:00',
                mergedDuration,
                id
            );
            const breakerIsTaken = createCircuitBreaker(actionIsTaken, 'DatabaseCheckSlot');
            const isTaken = await breakerIsTaken.fire();
            stopTimerIsTaken();
            if (isTaken) {
                throw new ConflictError('This appointment slot is already taken.');
            }
        }
        const stopTimerUpdate = dbQueryDurationMicroseconds.startTimer({ operation: 'save' });
        const actionUpdate = async () => this.appointmentRepository.updateAppointment(id, updateData);
        const breakerUpdate = createCircuitBreaker(actionUpdate, 'DatabaseUpdateAppointment');
        const result = await breakerUpdate.fire();
        stopTimerUpdate();

        // Emit queue update for real-time status tracking
        if (result && updateData.status && (global as any).io) {
            (global as any).io.emit("queue-update", {
                appointmentId: result.id,
                status: result.status,
                patientId: result.patientId
            });
            logger.info(`[Socket.io] Emitted queue-update for appointment ${result.id}: ${result.status}`);
        }

        return result;
    }

    /**
     * Deletes an appointment.
     */
    async deleteAppoitment(id: number): Promise<Appointment | null> {
        const stopTimerFind = dbQueryDurationMicroseconds.startTimer({ operation: 'findOneBy' });
        const actionFind = async () => this.appointmentRepository.findAppoitmentById({ id });
        const breakerFind = createCircuitBreaker(actionFind, 'DatabaseFindAppointment');
        const existing = await breakerFind.fire();
        stopTimerFind();
        if (!existing) {
            throw new NotFoundError('Appointment not found');
        }
        const stopTimerDelete = dbQueryDurationMicroseconds.startTimer({ operation: 'delete' });
        const actionDelete = async () => this.appointmentRepository.deleteAppoitment(id);
        const breakerDelete = createCircuitBreaker(actionDelete, 'DatabaseDeleteAppointment');
        const result = await breakerDelete.fire();
        stopTimerDelete();
        return result;
    }
}

export default AppointmentService;