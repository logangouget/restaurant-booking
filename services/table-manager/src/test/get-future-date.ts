import { addDays } from 'date-fns';

export const getFutureDate = (
  daysFromToday: number,
  hours?: number,
  min?: number,
): Date => {
  let date = new Date();

  date = addDays(date, daysFromToday);

  date.setHours(hours ?? 1, min ?? 0, 0, 0);

  return date;
};
