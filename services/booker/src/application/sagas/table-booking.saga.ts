import {
  EventType,
  PersistentSubscriptionToStream,
  PersistentSubscriptionToStreamResolvedEvent,
} from '@eventstore/db-client';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventStoreDbService, JSONType } from '@rb/event-sourcing';
import {
  JSONMetadata,
  parseTableLockPlacedEventData,
  parseTableLockPlacementFailedEventData,
} from '@rb/events';
import { ConfirmTableBookingCommand } from '../features/confirm-table-booking/confirm-table-booking.command';
import { ConfigService } from '@nestjs/config';
import { CancelTableBookingCommand } from '../features/cancel-table-booking/cancel-table-booking.command';

@Injectable()
export class TableBookingSaga {
  constructor(
    private readonly eventStoreDbService: EventStoreDbService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const tableLockPlacedStreamName = '$et-table-lock-placed';

    const tableLockPlacedGroupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_GROUP_NAME',
    );

    const { source$: tableLockedSource$, subscription: tableLockSubscription } =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockPlacedStreamName,
        tableLockPlacedGroupName,
      );

    tableLockedSource$.subscribe((resolvedEvent) => {
      this.onTableLocked(resolvedEvent, tableLockSubscription);
    });

    const tableLockPlacementFailedStreamName =
      '$et-table-lock-placement-failed';

    const tableLockPlacementFailedGroupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_GROUP_NAME',
    );

    const {
      source$: tableLockPlacementFailedSource$,
      subscription: tableLockPlacementFailedSubscription,
    } = await this.eventStoreDbService.initPersistentSubscriptionToStream(
      tableLockPlacementFailedStreamName,
      tableLockPlacementFailedGroupName,
    );

    tableLockPlacementFailedSource$.subscribe((resolvedEvent) => {
      this.onTableLockPlacementFailed(
        resolvedEvent,
        tableLockPlacementFailedSubscription,
      );
    });
  }

  async onTableLockPlacementFailed(
    resolvedEvent: PersistentSubscriptionToStreamResolvedEvent<{
      type: string;
      data: JSONType;
      metadata?: unknown;
    }>,
    subscription: PersistentSubscriptionToStream<EventType>,
  ) {
    const eventData = parseTableLockPlacementFailedEventData(
      resolvedEvent.event.data,
    );
    const eventMetadata = resolvedEvent.event.metadata as JSONMetadata;

    const command = new CancelTableBookingCommand(
      eventData.tableId,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await subscription.ack(resolvedEvent);
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
