import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { bookings } from '@/infrastructure/repository/database/schemas';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ShowBookingQuery, ShowBookingQueryResult } from './show-booking.query';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TableBookingNotFoundError } from '@/application/errors';

@QueryHandler(ShowBookingQuery)
export class ShowBookingQueryHandler
  implements IQueryHandler<ShowBookingQuery>
{
  constructor(
    @Inject(DB)
    private readonly db: DbType,
  ) {}

  async execute(query: ShowBookingQuery): Promise<ShowBookingQueryResult> {
    const bookingResults = await this.db
      .select({
        id: bookings.id,
        timeSlotFrom: bookings.timeSlotFrom,
        timeSlotTo: bookings.timeSlotTo,
        tableId: bookings.tableId,
        status: bookings.status,
      })
      .from(bookings)
      .where(eq(bookings.id, query.id))
      .execute();

    const booking = bookingResults[0];

    if (!booking) {
      throw new TableBookingNotFoundError(query.id);
    }

    return booking;
  }
}
