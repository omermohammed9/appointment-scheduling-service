import axios from 'axios';

async function fetchPatientDetails(patientId: number) {
    try {
        const response = await axios.get(`http://localhost:5000/patient/getpatientbyid/${patientId}`);
        console.log('Patient Details:', response.data);
    } catch (error) {
        console.error('Error fetching patient details:', error);
    }
}

// Example usage
fetchPatientDetails(1);