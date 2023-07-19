import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { bookings } from '@/infrastructure/repository/database/schemas';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  TableBookingEventType,
  parseTableBookingCancelledEventData,
  parseTableBookingInitiatedEventData,
  parseTableLockPlacedEventData,
} from '@rb/events';
import { eq } from 'drizzle-orm';

@Injectable()
export class BookingProjection {
  constructor(
    @Inject(DB)
    private readonly db: DbType,
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const logger = new Logger('BookingProjection');

    logger.debug('Initializing BookingProjection');

    const streamName = '$ce-table_booking';

    const groupName = this.configService.get<string>(
      'BOOKING_PROJECTION_GROUP_NAME',
    );

    const source$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$.subscribe(async (resolvedEvent) => {
      try {
        const type = resolvedEvent.type as TableBookingEventType;
        switch (type) {
          case 'table-booking-initiated':
            await this.onTableBookingInitiated(resolvedEvent);
            break;
          case 'table-booking-cancelled':
            await this.onTableBookingCancelled(resolvedEvent);
            break;
          case 'table-booking-confirmed':
            await this.onTableBookingConfirmed(resolvedEvent);
            break;
        }
      } catch (error) {
        logger.error(error);
      }
    });
  }

  private async onTableBookingInitiated(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventData = parseTableBookingInitiatedEventData(resolvedEvent.data);

    const currentBooking = await this.db
      .select({
        id: bookings.id,
      })
      .from(bookings)
      .where(eq(bookings.id, eventData.id));

    if (currentBooking.length > 0) {
      await resolvedEvent.ack();
      return;
    }

    await this.db.insert(bookings).values({
      id: eventData.id,
      tableId: eventData.tableId,
      timeSlotFrom: new Date(eventData.timeSlot.from),
      timeSlotTo: new Date(eventData.timeSlot.to),
      status: 'initiated',
      revision: resolvedEvent.revision,
    });

    await resolvedEvent.ack();
  }

  private async onTableBookingCancelled(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventData = parseTableBookingCancelledEventData(resolvedEvent.data);

    const bookingResults = await this.db
      .select({
        revision: bookings.revision,
      })
      .from(bookings)
      .where(eq(bookings.id, eventData.id));

    if (bookingResults.length === 0) {
      await resolvedEvent.nack('retry', 'Booking not found');
      return;
    }

    const booking = bookingResults[0];

    if (booking.revision + 1 !== resolvedEvent.revision) {
      await resolvedEvent.nack('retry', 'Booking revision mismatch');
      return;
    }

    await this.db
      .update(bookings)
      .set({
        status: 'cancelled',
        revision: resolvedEvent.revision,
      })
      .where(eq(bookings.id, eventData.id));

    await resolvedEvent.ack();
  }

  private async onTableBookingConfirmed(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventData = parseTableLockPlacedEventData(resolvedEvent.data);

    const tableResults = await this.db
      .select({
        revision: bookings.revision,
      })
      .from(bookings)
      .where(eq(bookings.id, eventData.id));

    if (tableResults.length === 0) {
      await resolvedEvent.nack('retry', 'Booking not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      await resolvedEvent.nack('retry', 'Booking revision mismatch');
      return;
    }

    await this.db
      .update(bookings)
      .set({
        revision: resolvedEvent.revision,
        status: 'confirmed',
      })
      .where(eq(bookings.id, eventData.id));

    await resolvedEvent.ack();
  }
}
