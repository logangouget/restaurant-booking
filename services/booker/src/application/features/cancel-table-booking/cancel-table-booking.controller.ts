import { TableBookingNotFoundError } from '@/application/errors';
import {
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { CancelTableBookingCommand } from './cancel-table-booking.command';

@Controller()
export class CancelTableBookingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('bookings/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel a table booking' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the booking to cancel',
  })
  @ApiOkResponse({
    description: 'The booking was successfully cancelled',
    status: 200,
  })
  @ApiNotFoundResponse({ description: 'The booking could not be found' })
  async cancelTableBooking(@Param('id') bookingId: string) {
    const command = new CancelTableBookingCommand(bookingId);

    try {
      await this.commandBus.execute(command);
    } catch (error) {
      if (error instanceof TableBookingNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
