import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ListAvailableBookingSlotsController } from './list-available-booking-slots.controller';
import { ListAvailableBookingSlotsHandler } from './list-available-booking-slots.handler';

@Module({
  imports: [CqrsModule],
  controllers: [ListAvailableBookingSlotsController],
  providers: [ListAvailableBookingSlotsHandler],
})
export class ListAvailableBookingSlotsModule {}
