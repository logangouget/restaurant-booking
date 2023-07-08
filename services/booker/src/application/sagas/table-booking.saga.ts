import {
  EventType,
  PersistentSubscriptionToStream,
  PersistentSubscriptionToStreamResolvedEvent,
} from '@eventstore/db-client';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventStoreDbService, JSONType } from '@rb/event-sourcing';
import { JSONMetadata, parseTableLockPlacedEventData } from '@rb/events';
import { ConfirmTableBookingCommand } from '../features/confirm-table-booking/confirm-table-booking.command';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TableBookingSaga {
  constructor(
    private readonly eventStoreDbService: EventStoreDbService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const streamName = '$et-table-lock-placed';

    const groupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_GROUP_NAME',
    );

    const { source$, subscription } =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$.subscribe((resolvedEvent) => {
      this.onTableLocked(resolvedEvent, subscription);
    });
  }

  async onTableLocked(
    resolvedEvent: PersistentSubscriptionToStreamResolvedEvent<{
      type: string;
      data: JSONType;
      metadata?: unknown;
    }>,
    subscription: PersistentSubscriptionToStream<EventType>,
  ) {
    const eventData = parseTableLockPlacedEventData(resolvedEvent.event.data);
    const eventMetadata = resolvedEvent.event.metadata as JSONMetadata;

    const command = new ConfirmTableBookingCommand(
      eventData.id,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await subscription.ack(resolvedEvent);
  }
}
