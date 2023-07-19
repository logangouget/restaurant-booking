import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ListAvailableBookingSlotsQuery,
  ListAvailableBookingSlotsQueryResult,
} from './list-available-booking-slots.query';
import { QueryBus } from '@nestjs/cqrs';
import { ListAvailableBookingSlotsRequestQuery } from './dto/list-available-booking-slots.request-query';

@Controller('booking-slots')
@UsePipes(new ValidationPipe())
export class ListAvailableBookingSlotsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async listAvailableBookingSlots(
    @Query() query: ListAvailableBookingSlotsRequestQuery,
  ): Promise<ListAvailableBookingSlotsQueryResult> {
    return this.queryBus.execute(
      new ListAvailableBookingSlotsQuery(
        new Date(query.startDate),
        new Date(query.endDate),
        query.people,
      ),
    );
  }
}
