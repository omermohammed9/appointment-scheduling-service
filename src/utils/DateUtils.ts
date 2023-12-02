import moment from 'moment';
import exp from "constants";

export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    return moment(date).format(format);
}
export function isFutureDate(date: Date): boolean {
    return moment(date).isAfter(moment());
}
export function isSameOrAfter(date1: Date, date2: Date): boolean {
    return moment(date1).isSameOrAfter(date2);
}

export function isSameOrBefore(date1: Date, date2: Date): boolean {
    return moment(date1).isSameOrBefore(date2);
}

export function convertToTimeZone(date: Date, timeZone: string): Date {
    return moment(date).tz(timeZone).toDate();
}
export function getDurationBetweenDates(startDate: Date, endDate: Date, unit: moment.unitOfTime.Diff = 'minutes'): number {
    return moment(endDate).diff(moment(startDate), unit);
}
export function combineDateAndTime(date: Date, time: string | undefined): Date {
    const timeFormat = "HH:mm"; // Adjust this format to match your time string
    const dateString = moment(date).format('YYYY-MM-DD');
    return moment(`${dateString} ${time}`, `YYYY-MM-DD ${timeFormat}`).toDate();
}
export function isDateTimeInFuture(appointmentDate: Date, appointmentTime: string, timezone: string): boolean {
    // Convert the appointment date and time to the specified timezone
    const appointmentDateTime = moment.tz(`${moment(appointmentDate).format('YYYY-MM-DD')} ${appointmentTime}`, 'YYYY-MM-DD HH:mm', timezone);

    // Get the current date and time in the specified timezone
    const currentDateTime = moment().tz(timezone);

    // Compare if the appointment date and time is in the future relative to the current date and time
    return appointmentDateTime.isAfter(currentDateTime);
}
export function isDateTimeInPast(dateTime: Date): boolean {
    return moment().isAfter(moment(dateTime));
}

export function isValidTimeFormat(time: string): boolean {
    const timeFormat = "HH:mm"; // Adjust this format to match your time string
    return moment(time, timeFormat).isValid();
}