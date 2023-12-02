// dateTimeUtils.ts
import moment from 'moment';

export function calculateStartEndDateTime(date: Date, time: string, duration: number) {
    const startDateTime = moment(date).set({
        hour: parseInt(time.split(':')[0]),
        minute: parseInt(time.split(':')[1]),
        second: 0
    });
    const endDateTime = startDateTime.clone().add(duration, 'hours');

    return { startDateTime, endDateTime };
}
