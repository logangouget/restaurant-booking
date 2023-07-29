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

  private isValidMorningTimeSlot({
    fromHours,
    fromMinutes,
    toHours,
    toMinutes,
  }: {
    fromHours: number;
    fromMinutes: number;
    toHours: number;
    toMinutes: number;
  }): boolean {
    return (
      fromHours === timeSlotConfiguration.morning.from.hours &&
      fromMinutes === timeSlotConfiguration.morning.from.minutes &&
      toHours === timeSlotConfiguration.morning.to.hours &&
      toMinutes === timeSlotConfiguration.morning.to.minutes
    );
  }

  private isValidEveningTimeSlot({
    fromHours,
    fromMinutes,
    toHours,
    toMinutes,
  }: {
    fromHours: number;
    fromMinutes: number;
    toHours: number;
    toMinutes: number;
  }): boolean {
    return (
      fromHours === timeSlotConfiguration.evening.from.hours &&
      fromMinutes === timeSlotConfiguration.evening.from.minutes &&
      toHours === timeSlotConfiguration.evening.to.hours &&
      toMinutes === timeSlotConfiguration.evening.to.minutes
    );
  }

  private isFutureTimeSlot(): boolean {
    const now = new Date();

    return (
      this.from.getTime() > now.getTime() && this.to.getTime() > now.getTime()
    );
  }

  public isValid(): boolean {
    const fromHours = this.from.getHours();
    const fromMinutes = this.from.getMinutes();

    const toHours = this.to.getHours();
    const toMinutes = this.to.getMinutes();

    const isValidMorning = this.isValidMorningTimeSlot({
      fromHours,
      fromMinutes,
      toHours,
      toMinutes,
    });

    const isValidEvening = this.isValidEveningTimeSlot({
      fromHours,
      fromMinutes,
      toHours,
      toMinutes,
    });

    const isFutureTimeSlot = this.isFutureTimeSlot();

    return isFutureTimeSlot && (isValidMorning || isValidEvening);
  }
}
