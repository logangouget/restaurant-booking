import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ShowBookingQuery } from './show-booking.query';
import { TableBookingNotFoundError } from '@/application/errors';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';
import { ShowBookingResponse } from './dto/show-booking.response';
@Controller()
export class ShowBookingController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('bookings/:id')
  @ApiProperty({
    description: 'Show a booking',
    type: ShowBookingResponse,
  })
  @ApiResponse({
    status: 200,
    description: 'The booking has been successfully shown.',
    type: ShowBookingResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'The booking does not exist.',
  })
  async showBooking(@Param('id') id: string): Promise<ShowBookingResponse> {
    try {
      const booking = await this.queryBus.execute(new ShowBookingQuery(id));

      return new ShowBookingResponse(booking);
    } catch (error) {
      if (error instanceof TableBookingNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
