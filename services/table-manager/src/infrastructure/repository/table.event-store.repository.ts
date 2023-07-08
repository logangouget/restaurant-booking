import { Table } from '@/domain/table';
import { Injectable } from '@nestjs/common';
import {
  EventStoreDbService,
  JSONEventType,
  ResolvedEvent,
} from '@rb/event-sourcing';
import {
  TableAddedEvent,
  TableEventType,
  TableLockPlacedEvent,
  TableRemovedEvent,
  parseTableAddedEventData,
  parseTableLockPlacedEventData,
  parseTableRemovedEventData,
} from '@rb/events';
import { TableBaseEvent } from '@rb/events/dist/table/table-base-event';
import { lastValueFrom, toArray } from 'rxjs';
import { TableEventStoreRepositoryInterface } from './table.event-store.repository.interface';

@Injectable()
export class TableEventStoreRepository
  implements TableEventStoreRepositoryInterface
{
  constructor(private readonly eventStoreDbService: EventStoreDbService) {}

  async findTableById(id: string): Promise<Table | null> {
    const streamName = TableBaseEvent.buildStreamName(id);

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

    return Table.fromEventsHistory(mappedEvents);
  }

  async publish(events: TableAddedEvent[]): Promise<void> {
    for (const event of events) {
      await this.eventStoreDbService.publish(event);
    }
  }

  private mapEventsFromJsonEvents(
    resolvedEvents: ResolvedEvent<JSONEventType>[],
  ) {
    return resolvedEvents.map((resolvedEvent) => {
      switch (resolvedEvent.event.type as TableEventType) {
        case 'table-added': {
          const data = parseTableAddedEventData(resolvedEvent.event.data);

          return new TableAddedEvent(data);
        }
        case 'table-removed': {
          const data = parseTableRemovedEventData(resolvedEvent.event.data);

          return new TableRemovedEvent(data.id);
        }
        case 'table-lock-placed': {
          const data = parseTableLockPlacedEventData(resolvedEvent.event.data);

          return new TableLockPlacedEvent(data);
        }
        default:
          throw new Error(
            `Event type ${resolvedEvent.event.type} not supported`,
          );
      }
    });
  }
}
