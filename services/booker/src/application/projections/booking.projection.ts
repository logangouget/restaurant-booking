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
  TableBookingEvent,
  TableBookingEventType,
  parseTableBookingCancelledEventData,
  parseTableBookingInitiatedEventData,
  parseTableLockPlacedEventData,
} from '@rb/events';
import { eq } from 'drizzle-orm';
import { concatMap, groupBy, mergeMap } from 'rxjs';

@Injectable()
export class BookingProjection {
  private readonly logger = new Logger(BookingProjection.name);

  constructor(
    @Inject(DB)
    private readonly db: DbType,
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    this.logger.log('Initializing BookingProjection');

    const streamName = '$ce-table_booking';
    const groupName = this.configService.get<string>(
      'BOOKING_PROJECTION_GROUP_NAME',
    );

    const source$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$
      .pipe(
        groupBy((event) => (event.data as TableBookingEvent['data']).id),
        mergeMap((group$) =>
          group$.pipe(concatMap((event) => this.handleEvent(event))),
        ),
      )
      .subscribe();
  }

  private async handleEvent(resolvedEvent: AcknowledgeableEventStoreEvent) {
    this.logger.debug(`Handling event: ${resolvedEvent.type}`);

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
        default:
          this.logger.warn(`Unhandled event type: ${type}`);
      }
    } catch (error) {
      this.logger.error(error);
    }
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
      this.logger.warn(`Booking not found: ${eventData.id}`);
      await resolvedEvent.nack('retry', 'Booking not found');
      return;
    }

    const booking = bookingResults[0];

    if (booking.revision + 1 !== resolvedEvent.revision) {
      this.logger.warn('Booking revision mismatch', {
        bookingId: eventData.id,
        currentRevision: booking.revision,
        eventRevision: resolvedEvent.revision,
      });
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

    const bookingResults = await this.db
      .select({
        revision: bookings.revision,
      })
      .from(bookings)
      .where(eq(bookings.id, eventData.id));

    if (bookingResults.length === 0) {
      this.logger.warn(`Booking not found: ${eventData.id}`);
      await resolvedEvent.nack('retry', 'Booking not found');
      return;
    }

    const booking = bookingResults[0];

    if (booking.revision + 1 !== resolvedEvent.revision) {
      this.logger.warn('Booking revision mismatch', {
        bookingId: eventData.id,
        currentRevision: booking.revision,
        eventRevision: resolvedEvent.revision,
      });
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
