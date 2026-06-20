import AppointmentService from '@/service/AppointmentService';
import AppointmentRepository from '@/repository/AppointmentRepository';
import AppDataSource from '@/database/database';
import { isDateTimeInFuture } from '@/utils/DateUtils';
import { NotFoundError, BadRequestError, ConflictError } from '@/utils/CustomErrors';

jest.mock('@/repository/AppointmentRepository');
jest.mock('@/database/database', () => ({
    getRepository: jest.fn()
}));
jest.mock('@/utils/DateUtils', () => ({
    isDateTimeInFuture: jest.fn()
}));
jest.mock('@/winston/WinstonLogger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));
jest.mock('@/metrics/metricsService', () => ({
    dbQueryDurationMicroseconds: { startTimer: jest.fn(() => jest.fn()) }
}));
jest.mock('@/utils/circuitBreaker', () => ({
    createCircuitBreaker: jest.fn((action) => ({
        fire: jest.fn(() => action())
    }))
}));

describe('AppointmentService', () => {
    let appointmentService: AppointmentService;
    let mockAppointmentRepository: jest.Mocked<AppointmentRepository>;

    beforeEach(() => {
        mockAppointmentRepository = {
            findAllAppointments: jest.fn(),
            findAppoitmentById: jest.fn(),
            createAppointment: jest.fn(),
            updateAppointment: jest.fn(),
            deleteAppoitment: jest.fn(),
            isAppointmentSlotTaken: jest.fn()
        } as any;
        appointmentService = new AppointmentService(mockAppointmentRepository);
        jest.clearAllMocks();
    });

    describe('verifyPatientExists', () => {
        it('should return true if patient exists in cache', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);

            const exists = await appointmentService.verifyPatientExists(1);
            expect(exists).toBe(true);
        });

        it('should return false if patient does not exist in cache', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);

            const exists = await appointmentService.verifyPatientExists(1);
            expect(exists).toBe(false);
        });
    });

    describe('createAppointment', () => {
        it('should create an appointment if validation passes', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);
            (isDateTimeInFuture as jest.Mock).mockReturnValue(true);
            mockAppointmentRepository.isAppointmentSlotTaken.mockResolvedValue(false);
            mockAppointmentRepository.createAppointment.mockResolvedValue({ id: 1, patientId: 1 } as any);

            const result = await appointmentService.createAppointment({ patientId: 1 } as any);
            expect(result.id).toBe(1);
        });

        it('should throw NotFoundError if patient does not exist', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);

            await expect(appointmentService.createAppointment({ patientId: 1 } as any)).rejects.toThrow(NotFoundError);
        });

        it('should throw BadRequestError if appointment time is not in the future', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);
            (isDateTimeInFuture as jest.Mock).mockReturnValue(false);

            await expect(appointmentService.createAppointment({ patientId: 1 } as any)).rejects.toThrow(BadRequestError);
        });

        it('should throw ConflictError if slot is taken', async () => {
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);
            (isDateTimeInFuture as jest.Mock).mockReturnValue(true);
            mockAppointmentRepository.isAppointmentSlotTaken.mockResolvedValue(true);

            await expect(appointmentService.createAppointment({ patientId: 1 } as any)).rejects.toThrow(ConflictError);
        });
    });

    describe('findAppoitmentById', () => {
        it('should return appointment if found', async () => {
            const appointment = { id: 1 };
            mockAppointmentRepository.findAppoitmentById.mockResolvedValue(appointment as any);

            const result = await appointmentService.findAppoitmentById(1);
            expect(result).toEqual(appointment);
        });
    });

    describe('updateAppoitment', () => {
        it('should update appointment successfully', async () => {
            const appointment = { id: 1, patientId: 1, date: '2026-01-01' };
            mockAppointmentRepository.findAppoitmentById.mockResolvedValue(appointment as any);
            const mockCacheRepo = { findOneBy: jest.fn().mockResolvedValue({ id: 1 }) };
            (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCacheRepo);
            mockAppointmentRepository.isAppointmentSlotTaken.mockResolvedValue(false);
            mockAppointmentRepository.updateAppointment.mockResolvedValue({ ...appointment, duration: 30 } as any);

            const result = await appointmentService.updateAppoitment(1, { duration: 30 } as any);
            expect(result?.duration).toBe(30);
        });

        it('should throw NotFoundError if appointment not found', async () => {
            mockAppointmentRepository.findAppoitmentById.mockResolvedValue(null);
            await expect(appointmentService.updateAppoitment(1, {} as any)).rejects.toThrow(NotFoundError);
        });
    });

    describe('deleteAppoitment', () => {
        it('should delete appointment', async () => {
            mockAppointmentRepository.findAppoitmentById.mockResolvedValue({ id: 1 } as any);
            mockAppointmentRepository.deleteAppoitment.mockResolvedValue({ id: 1 } as any);

            const result = await appointmentService.deleteAppoitment(1);
            expect(mockAppointmentRepository.deleteAppoitment).toHaveBeenCalledWith(1);
            expect(result?.id).toBe(1);
        });
    });
});
