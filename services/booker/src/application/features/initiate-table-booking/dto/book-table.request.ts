import { TimeSlot as TimeSlotVO } from '@/domain/time-slot.value-object';
import { timeSlotConfiguration } from '@/domain/timeslot-configuration';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'timeSlot', async: false })
export class TimeSlotConstraint implements ValidatorConstraintInterface {
  validate(timeslot: TimeSlot) {
    return new TimeSlotVO(timeslot.from, timeslot.to).isValid();
  }

  private formatTime(time: { hours: number; minutes: number }) {
    const paddedHours = time.hours.toString().padStart(2, '0');
    const paddedMinutes = time.minutes.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}`;
  }

  defaultMessage() {
    const fromMorning = this.formatTime(timeSlotConfiguration.morning.from);
    const toMorning = this.formatTime(timeSlotConfiguration.morning.to);

    const fromEvening = this.formatTime(timeSlotConfiguration.evening.from);
    const toEvening = this.formatTime(timeSlotConfiguration.evening.to);

    return `Invalid time slot. Valid time slots are: ${fromMorning} - ${toMorning} and ${fromEvening} - ${toEvening}.`;
  }
}

export class TimeSlot {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  from: Date;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  @IsDate()
  to: Date;
}

export class BookTableRequest {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty()
  @Type(() => TimeSlot)
  @ValidateNested()
  @Validate(TimeSlotConstraint)
  timeSlot: TimeSlot;
}
