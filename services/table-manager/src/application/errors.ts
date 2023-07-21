import { TimeSlot } from '@rb/events/dist/time-slot';

export class TableNotFoundError extends Error {
  constructor(id: string) {
    super(`Table with id ${id} not found`);
  }
}

export class TableLockNotFoundError extends Error {
  constructor(id: string, timeSlot: TimeSlot) {
    super(
      `Table with id ${id} not found for time slot ${timeSlot.from} - ${timeSlot.to}`,
    );
  }
}

export class TableLockedError extends Error {
  constructor(id: string) {
    super(`Table with id ${id} is locked`);
  }
}
