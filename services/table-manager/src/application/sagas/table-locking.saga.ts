import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  JSONMetadata,
  parseTableBookingCancelledEventData,
  parseTableBookingInitiatedEventData,
  parseTableLockPlacedEventData,
} from '@rb/events';
import { TableNotFoundError } from '../errors';
import { PlaceTableLockCommand } from '../features/place-table-lock/place-table-lock.command';
import { ScheduleTableLockRemovalCommand } from '../features/remove-table-lock/schedule-table-lock-removal.command';
import { RemoveTableLockCommand } from '../features/remove-table-lock/remove-table-lock.command';

@Injectable()
export class TableLockingSaga {
  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const logger = new Logger('TableLockingSaga');

    logger.debug('Initializing TableLockingSaga');

    const streamName = '$et-table-booking-initiated';

    const groupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const source$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$.subscribe(async (resolvedEvent) => {
      try {
        await this.onTableBookingInitiated(resolvedEvent);
      } catch (error) {
        logger.error(error);
      }
    });

    const tableLockedStreamName = '$et-table-lock-placed';
    const tableLockedGroupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const tableLockedSource$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockedStreamName,
        tableLockedGroupName,
      );

    tableLockedSource$.subscribe(async (resolvedEvent) => {
      try {
        await this.onTableLocked(resolvedEvent);
      } catch (error) {
        logger.error(error);
      }
    });

    const bookingCancelledStreamName = '$et-table-booking-cancelled';
    const bookingCancelledGroupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const bookingCancelledSource$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        bookingCancelledStreamName,
        bookingCancelledGroupName,
      );

    bookingCancelledSource$.subscribe(async (resolvedEvent) => {
      try {
        await this.onBookingCancelled(resolvedEvent);
      } catch (error) {
        logger.error(error);
      }
    });
  }

  async onTableBookingInitiated(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableBookingInitiatedEventData(resolvedEvent.data);

    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new PlaceTableLockCommand(
      eventData.tableId,
      eventData.timeSlot,
      eventMetadata.$correlationId,
    );

    try {
      await this.commandBus.execute(command);
    } catch (error) {
      if (error instanceof TableNotFoundError) {
        await resolvedEvent.ack();
        return;
      }
      throw error;
    }

    await resolvedEvent.ack();
  }

  async onTableLocked(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableLockPlacedEventData(resolvedEvent.data);

    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new ScheduleTableLockRemovalCommand(
      eventData.id,
      eventData.timeSlot,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }

  async onBookingCancelled(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableBookingCancelledEventData(resolvedEvent.data);

    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new RemoveTableLockCommand(
      eventData.tableId,
      eventData.timeSlot,
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }
}
