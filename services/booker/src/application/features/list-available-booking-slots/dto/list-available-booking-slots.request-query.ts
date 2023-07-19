import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

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
