import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRange implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const startDate = args.object['startDate'] as string;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diff / (1000 * 3600 * 24));

    if (diffDays > 14) {
      return false;
    }

    return true;
  }

  defaultMessage() {
    return 'Date ($value) is not in range! (14 days)';
  }
}

export class ListAvailableBookingSlotsRequestQuery {
  @IsDateString()
  @ApiProperty({
    description: 'The start date of the booking slot',
    example: '2021-01-01',
  })
  startDate: string;

  @IsDateString()
  @ApiProperty({
    description: 'The end date of the booking slot',
    example: '2021-01-01',
  })
  @Validate(DateRange)
  endDate: string;

  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  @ApiProperty({
    description: 'The number of people for the booking',
    example: '2',
  })
  people: number;
}
