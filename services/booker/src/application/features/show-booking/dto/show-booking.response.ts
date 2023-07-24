import { ApiProperty } from '@nestjs/swagger';

class BookingTimeSlot {
  @ApiProperty({
    description: 'The time slot from',
  })
  from: string;

  @ApiProperty({
    description: 'The time slot to',
  })
  to: string;
}

export class ShowBookingResponse {
  @ApiProperty({
    description: 'The id of the booking',
  })
  id: string;

  @ApiProperty({
    description: 'The id of the table',
  })
  tableId: string;

  @ApiProperty({
    description: 'The status of the booking',
    enum: ['initiated', 'cancelled', 'confirmed'],
  })
  status: 'initiated' | 'cancelled' | 'confirmed';

  @ApiProperty({
    description: 'The time slot of the booking',
    type: BookingTimeSlot,
  })
  timeSlot: BookingTimeSlot;

  constructor({
    id,
    tableId,
    status,
    timeSlotFrom,
    timeSlotTo,
  }: {
    id: string;
    tableId: string;
    status: 'initiated' | 'cancelled' | 'confirmed';
    timeSlotFrom: Date;
    timeSlotTo: Date;
  }) {
    this.id = id;
    this.tableId = tableId;
    this.status = status;
    this.timeSlot = {
      from: timeSlotFrom.toISOString(),
      to: timeSlotTo.toISOString(),
    };
  }
}
