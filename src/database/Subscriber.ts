import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from "typeorm";
import {Appointment} from "../entity/Appointment";

@EventSubscriber()
 class PatientSubscriber implements EntitySubscriberInterface<Appointment> {
    listenTo() {
        return Appointment;
    }

    afterInsert(event: InsertEvent<Appointment>) {
        console.log(`An Appointment record was inserted:`, event.entity);
    }
}

export default PatientSubscriber;