import {DataSource, FindOptionsWhere} from "typeorm";
import {Appointment} from "../entity/Appointment";
import CreateAppointmentDTO from "../dto/CreateAppointmentDTO";
import {UpdateAppointmentDTO} from "../dto/UpdateAppointmentDTO";

class AppointmentRepository {
    private AppointmentRepository;

    constructor(private database: DataSource) {
        this.AppointmentRepository = this.database.getRepository(Appointment);
    }
    async findAllAppointments(): Promise<Appointment[]> {
        console.log("Repository:findAllAppointments");
        const Appointments = await this.AppointmentRepository.find();
        console.log(`Appointments Repository: Found ${(await Appointments).length} Appointments`);
        return Appointments;
    }

    async findAppoitmentById(criteria: Partial<Appointment>): Promise<Appointment | null> {
        console.log("Repository:findAppoitmentById");
        if ('id' in criteria && typeof criteria.id !== 'number') {
            throw new Error('Invalid ID provided');
        }
        return await this.AppointmentRepository.findOneBy(criteria as FindOptionsWhere<Appointment>);
    }

    async createAppointment(appointment: Omit<CreateAppointmentDTO, 'id'>): Promise<Appointment> {
        console.log("Repository: createAppointment");
        try {
            const newAppointment = this.AppointmentRepository.create(appointment);
            await this.AppointmentRepository.save(newAppointment);
            return newAppointment;
        } catch (error) {
            // Handle or throw the error appropriately
            console.error("Error creating appointment:", error);
            throw error;
        }
    }

    async updateAppointment(id: number, AppointmentData: UpdateAppointmentDTO): Promise<Appointment | null> {
        console.log("Repository: update Appoitment started");
        const UpdateAppointment = await this.AppointmentRepository.update({id}, AppointmentData);
        if (UpdateAppointment.affected && UpdateAppointment.affected > 0) {
            return this.AppointmentRepository.findOneBy({id});
        }
        return null;
    }
    async deleteAppoitment(id: number): Promise<Appointment | null> {
        console.log("Repository: delete Appoitment started");
        const DeleteAppoitment = await this.AppointmentRepository.delete(id);
        if (DeleteAppoitment.affected === 0) {
            throw new Error('No patient found with the given ID.');
        }
        return null;
    }

}
export default AppointmentRepository;