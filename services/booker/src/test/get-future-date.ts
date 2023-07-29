import { TimeSlot } from '@/domain/time-slot.value-object';
import { timeSlotConfiguration } from '@/domain/timeslot-configuration';
import { addDays } from 'date-fns';

const getFutureDate = (
  daysFromToday: number,
  hours: number,
  min?: number,
): Date => {
  let date = new Date();

  date = addDays(date, daysFromToday);

  date.setHours(hours, min ?? 0, 0, 0);

  return date;
};

export const getValidFutureTimeSlot = (options?: {
  evening: boolean;
}): TimeSlot => {
  if (options?.evening) {
    const from = getFutureDate(1, timeSlotConfiguration.evening.from.hours, 0);
    const to = getFutureDate(1, timeSlotConfiguration.evening.to.hours, 0);

    return new TimeSlot(from, to);
  }

  const from = getFutureDate(1, timeSlotConfiguration.morning.from.hours, 0);
  const to = getFutureDate(1, timeSlotConfiguration.morning.to.hours, 0);

  return new TimeSlot(from, to);
};
