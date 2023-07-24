import { Module } from '@nestjs/common';
import { ShowBookingController } from './show-booking.controller';
import { ShowBookingQueryHandler } from './show-booking.handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [ShowBookingController],
  providers: [ShowBookingQueryHandler],
})
export class ShowBookingModule {}
