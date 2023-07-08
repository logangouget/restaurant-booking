import { TableBooking, TimeSlot } from '@/domain/table-booking';
import { Injectable } from '@nestjs/common';
import {
  EventStoreDbService,
  JSONEventType,
  ResolvedEvent,
} from '@rb/event-sourcing';
import {
  JSONMetadata,
  TableBookingConfirmedEvent,
  TableBookingEvent,
  TableBookingEventType,
  TableBookingInitiatedEvent,
  parseTableBookingConfirmedEventData,
  parseTableBookingInitiatedEventData,
} from '@rb/events';
import { TableBookingBaseEvent } from '@rb/events/dist/table-booking/table-booking-base-event';
import { lastValueFrom, toArray } from 'rxjs';
import { TableBookingEventStoreRepositoryInterface } from './table-booking.event-store.repository.interface';

@Injectable()
export class TableBookingEventStoreRepository
  implements TableBookingEventStoreRepositoryInterface
{
  constructor(private readonly eventStoreDbService: EventStoreDbService) {}

  async findBookingsByTimeSlot(
    tableId: string,
    timeSlot: TimeSlot,
  ): Promise<TableBooking[]> {
    const streamName = TableBookingBaseEvent.buildStreamName(tableId);

    const streamExists = await this.eventStoreDbService.streamExists(
      streamName,
    );

    if (!streamExists) {
      return [];
    }

    const events$ = this.eventStoreDbService.readStream(streamName);

    const resolvedEvents = await lastValueFrom(events$.pipe(toArray()));

    if (resolvedEvents.length === 0) {
      return [];
    }

    const mappedEvents = this.mapEventsFromJsonEvents(resolvedEvents);

    const bookingEvents = mappedEvents.reduce((acc, event) => {
      if (!acc[event.data.id]) {
        acc[event.data.id] = [];
      }

      acc[event.data.id].push(event);

      return acc;
    }, {} as Record<string, TableBookingEvent[]>);

    const tableBookings = Object.values(bookingEvents).map((bookingEvents) =>
      TableBooking.fromEventsHistory(bookingEvents),
    );

    return tableBookings.filter((booking) => {
      return (
        booking.status !== 'idle' &&
        booking.timeSlot.from.getTime() === timeSlot.from.getTime() &&
        booking.timeSlot.to.getTime() === timeSlot.to.getTime()
      );
    });
  }

  async findBookingByCorrelationId(
    tableId: string,
    correlationId: string,
  ): Promise<TableBooking | null> {
    const streamName = TableBookingBaseEvent.buildStreamName(tableId);

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

    const filteredEvents = mappedEvents.filter((event) => {
      return event.metadata.correlationId === correlationId;
    });

    if (filteredEvents.length === 0) {
      return null;
    }

    return TableBooking.fromEventsHistory(filteredEvents);
  }

  async publish(events: TableBookingEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventStoreDbService.publish(event);
    }
  }

  private mapEventsFromJsonEvents(
    resolvedEvents: ResolvedEvent<JSONEventType>[],
  ) {
    return resolvedEvents.map((resolvedEvent) => {
      switch (resolvedEvent.event.type as TableBookingEventType) {
        case 'table-booking-initiated': {
          const data = parseTableBookingInitiatedEventData(
            resolvedEvent.event.data,
          );

          const metadata = resolvedEvent.event.metadata as JSONMetadata;

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
          const data = parseTableBookingConfirmedEventData(
            resolvedEvent.event.data,
          );

          const metadata = resolvedEvent.event.metadata as JSONMetadata;

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
        default:
          throw new Error(
            `Event ${resolvedEvent.event.type} not supported by this repository`,
          );
      }
    });
  }
}
