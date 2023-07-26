import { timeSlotConfiguration } from './timeslot-configuration';

export class TimeSlot {
  public readonly from: Date;
  public readonly to: Date;

  constructor(from: Date, to: Date) {
    this.from = from;
    this.to = to;
  }

  public equals(other: TimeSlot): boolean {
    return (
      this.from.getTime() === other.from.getTime() &&
      this.to.getTime() === other.to.getTime()
    );
  }

  public isValid(): boolean {
    const fromHour = this.from.getHours();
    const fromMinutes = this.from.getMinutes();

    const toHour = this.to.getHours();
    const toMinutes = this.to.getMinutes();

    const isValidMorning =
      fromHour === timeSlotConfiguration.morning.from.hours &&
      fromMinutes === timeSlotConfiguration.morning.from.minutes &&
      toHour === timeSlotConfiguration.morning.to.hours &&
      toMinutes === timeSlotConfiguration.morning.to.minutes;

    const isValidEvening =
      fromHour === timeSlotConfiguration.evening.from.hours &&
      fromMinutes === timeSlotConfiguration.evening.from.minutes &&
      toHour === timeSlotConfiguration.evening.to.hours &&
      toMinutes === timeSlotConfiguration.evening.to.minutes;

    return isValidMorning || isValidEvening;
  }
}
