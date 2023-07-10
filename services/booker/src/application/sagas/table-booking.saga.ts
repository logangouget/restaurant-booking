import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EventStoreDbService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  JSONMetadata,
  parseTableLockPlacedEventData,
  parseTableLockPlacementFailedEventData,
} from '@rb/events';
import { CancelTableBookingCommand } from '../features/cancel-table-booking/cancel-table-booking.command';
import { ConfirmTableBookingCommand } from '../features/confirm-table-booking/confirm-table-booking.command';

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

    const tableLockedSource$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockPlacedStreamName,
        tableLockPlacedGroupName,
      );

    tableLockedSource$.subscribe((resolvedEvent) => {
      this.onTableLocked(resolvedEvent);
    });

    const tableLockPlacementFailedStreamName =
      '$et-table-lock-placement-failed';

    const tableLockPlacementFailedGroupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_GROUP_NAME',
    );

    const tableLockPlacementFailedSource$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockPlacementFailedStreamName,
        tableLockPlacementFailedGroupName,
      );

    tableLockPlacementFailedSource$.subscribe((resolvedEvent) => {
      this.onTableLockPlacementFailed(resolvedEvent);
    });
  }

  async onTableLockPlacementFailed(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventData = parseTableLockPlacementFailedEventData(
      resolvedEvent.data,
    );
    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new CancelTableBookingCommand(
      eventData.tableId,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }

  async onTableLocked(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableLockPlacedEventData(resolvedEvent.data);
    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new ConfirmTableBookingCommand(
      eventData.id,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }
}
