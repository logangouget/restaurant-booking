import { SlotUnavailableException } from '@/domain/exceptions';
import { TableBooking } from '@/domain/table-booking';
import {
  Body,
  ConflictException,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InitiateTableBookingRequest } from './dto/initiate-table-booking.request';
import { InitiateTableBookingResponse } from './dto/initiate-table-booking.response';
import { InitiateTableBookingCommand } from './initiate-table-booking.command';
import { ApiProperty, ApiResponse } from '@nestjs/swagger';

@Controller()
@UsePipes(
  new ValidationPipe({
    transform: true,
  }),
)
export class InitiateTableBookingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('booking/initiate')
  @ApiProperty({
    description: 'Initiate a booking',
    type: InitiateTableBookingResponse,
  })
  @ApiResponse({
    status: 201,
    description: 'The booking has been successfully initiated.',
    type: InitiateTableBookingResponse,
  })
  @ApiResponse({
    status: 409,
    description: 'The booking could not be initiated.',
  })
  async initiateBooking(
    @Body() body: InitiateTableBookingRequest,
  ): Promise<InitiateTableBookingResponse> {
    const command = new InitiateTableBookingCommand(
      body.tableId,
      body.timeSlot,
    );

    try {
      const tableBooking = await this.commandBus.execute<
        InitiateTableBookingCommand,
        TableBooking
      >(command);

      return new InitiateTableBookingResponse(
        tableBooking.tableId,
        tableBooking.id,
      );
    } catch (err) {
      if (err instanceof SlotUnavailableException) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
