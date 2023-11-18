import app from './app'; // Adjust the path as needed
import { DataSource } from 'typeorm';
import AppDataSource from './database/database'; // Adjust the path as needed

const PORT = process.env.PORT || 8000;

// Initialize database connection
AppDataSource.initialize()
    .then(() => {
        // Start the server once the database is connected
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Database connection: ${AppDataSource.options.database}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed', error);
    });
