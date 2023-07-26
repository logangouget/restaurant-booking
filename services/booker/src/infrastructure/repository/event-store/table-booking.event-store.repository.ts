import { TableBooking } from '@/domain/table-booking';
import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { EventStoreEvent } from '@rb/event-sourcing/dist/store/event-store-event';
import {
  JSONMetadata,
  TableBookingCancelledEvent,
  TableBookingConfirmedEvent,
  TableBookingEvent,
  TableBookingEventType,
  TableBookingInitiatedEvent,
  TableEventType,
  TableLockPlacedEvent,
  parseTableBookingCancelledEventData,
  parseTableBookingConfirmedEventData,
  parseTableBookingInitiatedEventData,
  parseTableLockPlacedEventData,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { TableBaseEvent } from '@rb/events/dist/table/table-base-event';
import {
  TableLockRemovedEvent,
  parseTableLockRemovedEventData,
} from '@rb/events/dist/table/table-lock-removed-event';
import { filter, lastValueFrom, map, toArray } from 'rxjs';
import { TableBookingEventStoreRepositoryInterface } from './table-booking.event-store.repository.interface';
import { TimeSlot } from '@/domain/time-slot.value-object';

@Injectable()
export class TableBookingEventStoreRepository
  implements TableBookingEventStoreRepositoryInterface
{
  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
  ) {}

  async isTableAvailableForTimeSlot(
    tableId: string,
    timeSlot: TimeSlot,
  ): Promise<boolean> {
    const streamName = TableBaseEvent.buildStreamName(tableId);
    const streamExists = await this.eventStoreDbService.streamExists(
      streamName,
    );

    if (!streamExists) {
      return true;
    }

    const events$ = this.eventStoreDbService.readStream(streamName);

    const tableLockEventsForTimeSlot = await lastValueFrom(
      events$.pipe(
        filter((event) => {
          const eventType = event.type as TableEventType;
          return (
            eventType === 'table-lock-placed' ||
            eventType === 'table-lock-removed'
          );
        }),
        map((event) => this.mapTableEventFromJsonEvent(event)),
        filter((event) => {
          return (
            event.data.timeSlot.from.getTime() === timeSlot.from.getTime() &&
            event.data.timeSlot.to.getTime() === timeSlot.to.getTime()
          );
        }),
        toArray(),
      ),
    );

    if (tableLockEventsForTimeSlot.length === 0) {
      return true;
    }

    const lastEvent =
      tableLockEventsForTimeSlot[tableLockEventsForTimeSlot.length - 1];

    return lastEvent.type === 'table-lock-removed';
  }

  async findBookingById(id: string): Promise<TableBooking | null> {
    const streamName = TableBookingBaseEvent.buildStreamName(id);

    const streamExists = await this.eventStoreDbService.streamExists(
      streamName,
    );

    if (!streamExists) {
      return null;
    }

    const events$ = this.eventStoreDbService.readStream(streamName);

    const resolvedEvents = await lastValueFrom(events$.pipe(toArray()));

    if (resolvedEvents.length === 0) {
      return null;
    }

    const mappedEvents = this.mapEventsFromJsonEvents(resolvedEvents);

    return TableBooking.fromEventsHistory(mappedEvents);
  }

  async publish(events: TableBookingEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventStoreDbService.publish(event);
    }
  }

  private mapEventsFromJsonEvents(resolvedEvents: EventStoreEvent[]) {
    return resolvedEvents.map((resolvedEvent) => {
      switch (resolvedEvent.type as TableBookingEventType) {
        case 'table-booking-initiated': {
          const data = parseTableBookingInitiatedEventData(resolvedEvent.data);

          const metadata = resolvedEvent.metadata as JSONMetadata;

          return new TableBookingInitiatedEvent(
            {
              id: data.id,
              tableId: data.tableId,
              timeSlot: data.timeSlot,
            },
            {
              correlationId: metadata.$correlationId,
            },
          );
        }
        case 'table-booking-confirmed': {
          const data = parseTableBookingConfirmedEventData(resolvedEvent.data);

          const metadata = resolvedEvent.metadata as JSONMetadata;

          return new TableBookingConfirmedEvent(
            {
              id: data.id,
              tableId: data.tableId,
              timeSlot: data.timeSlot,
            },
            {
              correlationId: metadata.$correlationId,
            },
          );
        }
        case 'table-booking-cancelled': {
          const data = parseTableBookingCancelledEventData(resolvedEvent.data);

          const metadata = resolvedEvent.metadata as JSONMetadata;

          return new TableBookingCancelledEvent(
            {
              id: data.id,
              tableId: data.tableId,
              timeSlot: data.timeSlot,
            },
            {
              correlationId: metadata.$correlationId,
            },
          );
        }
        default:
          throw new Error(
            `Event ${resolvedEvent.type} not supported by this repository`,
          );
      }
    });
  }

  private mapTableEventFromJsonEvent(resolvedEvent: EventStoreEvent) {
    switch (resolvedEvent.type as TableEventType) {
      case 'table-lock-placed': {
        const data = parseTableLockPlacedEventData(resolvedEvent.data);

        const metadata = resolvedEvent.metadata as JSONMetadata;

        return new TableLockPlacedEvent(data, {
          correlationId: metadata.$correlationId,
        });
      }
      case 'table-lock-removed': {
        const data = parseTableLockRemovedEventData(resolvedEvent.data);

        const metadata = resolvedEvent.metadata as JSONMetadata;

        return new TableLockRemovedEvent(data, {
          correlationId: metadata.$correlationId,
        });
      }

      default:
        throw new Error(
          `Event ${resolvedEvent.type} not supported by this repository`,
        );
    }
  }
}
