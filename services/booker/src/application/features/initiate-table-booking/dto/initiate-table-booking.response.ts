import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class InitiateTableBookingResponse {
  constructor(tableId: string, bookingId: string) {
    this.tableId = tableId;
    this.bookingId = bookingId;
  }

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bookingId: string;
}
