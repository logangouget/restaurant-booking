import {
  EventType,
  PersistentSubscriptionToStream,
  PersistentSubscriptionToStreamResolvedEvent,
} from '@eventstore/db-client';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventStoreDbService, JSONType } from '@rb/event-sourcing';
import { JSONMetadata, parseTableBookingInitiatedEventData } from '@rb/events';
import { PlaceTableLockCommand } from '../features/place-table-lock/place-table-lock.command';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TableLockingSaga {
  constructor(
    private readonly eventStoreDbService: EventStoreDbService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const streamName = '$et-table-booking-initiated';

    const groupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const { source$, subscription } =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$.subscribe((resolvedEvent) => {
      this.onTableBookingInitiated(resolvedEvent, subscription);
    });
  }

  async onTableBookingInitiated(
    resolvedEvent: PersistentSubscriptionToStreamResolvedEvent<{
      type: string;
      data: JSONType;
      metadata?: unknown;
    }>,
    subscription: PersistentSubscriptionToStream<EventType>,
  ) {
    const eventData = parseTableBookingInitiatedEventData(
      resolvedEvent.event.data,
    );

    const eventMetadata = resolvedEvent.event.metadata as JSONMetadata;

    const command = new PlaceTableLockCommand(
      eventData.tableId,
      {
        from: new Date(eventData.timeSlot.from),
        to: new Date(eventData.timeSlot.to),
      },
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await subscription.ack(resolvedEvent);
  }
}
