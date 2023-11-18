import { DataSource } from 'typeorm';
import {PostgresDataSourceOptions} from "./PostgresDataSourceOptions";


const AppDataSource = new DataSource(PostgresDataSourceOptions())
export const initializeDataSource = async () => {
   try {
      await AppDataSource.initialize();
      console.log("Database connected successfully.");
   } catch (error) {
      console.error("Error during Data Source initialization", error);
      throw error;
   }};

export default AppDataSource;