import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ListAvailableBookingSlotsHandler } from './list-available-booking-slots.handler';
import { ListAvailableBookingSlotsQuery } from './list-available-booking-slots.query';
import { ListAvailableBookingSlotsController } from './list-available-booking-slots.controller';

@Module({
  imports: [CqrsModule],
  controllers: [ListAvailableBookingSlotsController],
  providers: [ListAvailableBookingSlotsHandler, ListAvailableBookingSlotsQuery],
})
export class ListAvailableBookingSlotsModule {}
