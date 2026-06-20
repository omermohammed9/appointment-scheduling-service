import { Response } from 'express';

const sendResponse = (res: Response, statusCode: number, data: unknown = null, message = '') => {
    if (statusCode >= 400) {
        return res.status(statusCode).json({
            status: "error",
            message: message || "An error occurred",
            statusCode
        });
    }

    if (data) {
        return res.status(statusCode).json(data);
    } else {
        return res.status(statusCode).json({ message });
    }
};

export default sendResponse;