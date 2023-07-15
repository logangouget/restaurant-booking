import { Table } from '@/domain/table';
import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { EventStoreEvent } from '@rb/event-sourcing/dist/store/event-store-event';
import {
  Event,
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
  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
  ) {}

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

  async publish(events: Event<unknown, unknown>[]): Promise<void> {
    for (const event of events) {
      await this.eventStoreDbService.publish(event);
    }
  }

  private mapEventsFromJsonEvents(resolvedEvents: EventStoreEvent[]) {
    return resolvedEvents.map((resolvedEvent) => {
      switch (resolvedEvent.type as TableEventType) {
        case 'table-added': {
          const data = parseTableAddedEventData(resolvedEvent.data);

          return new TableAddedEvent(data);
        }
        case 'table-removed': {
          const data = parseTableRemovedEventData(resolvedEvent.data);

          return new TableRemovedEvent(data.id);
        }
        case 'table-lock-placed': {
          const data = parseTableLockPlacedEventData(resolvedEvent.data);

          return new TableLockPlacedEvent(data);
        }
        default:
          throw new Error(`Event type ${resolvedEvent.type} not supported`);
      }
    });
  }
}
