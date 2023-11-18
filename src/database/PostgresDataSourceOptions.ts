import {config} from "dotenv";
import Subscriber from "./Subscriber";
import {Appointment} from "../entity/Appointment";
import {DataSourceOptions} from "typeorm";

config({path: "./src/.env"});


export const PostgresDataSourceOptions = (): DataSourceOptions => {
    return  {
        type: 'postgres',
        host: String(process.env.DB_HOST) || 'No Host Provided for Postgres',
        port: parseInt(process.env.DB_PORT || 'No Port Provided for Postgres' ),
        username: String(process.env.DB_USERNAME) || 'No Username Provided for Postgres',
        password: String(process.env.DB_PASSWORD) || 'No Password Provided for Postgres',
        database: String(process.env.DB_DATABASE) || 'No Database Provided for Postgres',
        synchronize: true, // Be cautious with this in production!
        logging: false,
        entities:  [
            Appointment
        ],
        subscribers: [
            Subscriber
        ],
        // migrations: [
        //     PatientMigration1699631664469
        // ]
    };
}