import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  JSONMetadata,
  TableBookingEventType,
  TableEventType,
  parseTableBookingCancelledEventData,
  parseTableBookingInitiatedEventData,
  parseTableLockPlacedEventData,
} from '@rb/events';
import { merge, mergeMap } from 'rxjs';
import { TableNotFoundError } from '../errors';
import { PlaceTableLockCommand } from '../features/place-table-lock/place-table-lock.command';
import { RemoveTableLockCommand } from '../features/remove-table-lock/remove-table-lock.command';
import { ScheduleTableLockRemovalCommand } from '../features/remove-table-lock/schedule-table-lock-removal.command';

@Injectable()
export class TableLockingSaga {
  private readonly logger = new Logger(TableLockingSaga.name);

  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const logger = new Logger('TableLockingSaga');

    logger.log('Initializing TableLockingSaga');

    const streamName = '$et-table-booking-initiated';

    const groupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const tableLockedStreamName = '$et-table-lock-placed';
    const tableLockedGroupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const bookingCancelledStreamName = '$et-table-booking-cancelled';
    const bookingCancelledGroupName = this.configService.get<string>(
      'TABLE_LOCKING_SAGA_GROUP_NAME',
    );

    const sources$ = await Promise.all([
      this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      ),
      this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockedStreamName,
        tableLockedGroupName,
      ),
      this.eventStoreDbService.initPersistentSubscriptionToStream(
        bookingCancelledStreamName,
        bookingCancelledGroupName,
      ),
    ]);

    merge(sources$)
      .pipe(
        mergeMap((events) => events),
        mergeMap((event) => this.handleEvent(event)),
      )
      .subscribe();
  }

  private async handleEvent(resolvedEvent: AcknowledgeableEventStoreEvent) {
    this.logger.debug(`Handling event: ${resolvedEvent.type}`);

    switch (resolvedEvent.type as TableEventType | TableBookingEventType) {
      case 'table-booking-initiated':
        await this.onTableBookingInitiated(resolvedEvent);
        break;
      case 'table-lock-placed':
        await this.onTableLockPlaced(resolvedEvent);
        break;
      case 'table-booking-cancelled':
        await this.onBookingCancelled(resolvedEvent);
        break;
      default:
        this.logger.warn(`Unhandled event: ${resolvedEvent.type}`);
    }
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

  async onTableLockPlaced(resolvedEvent: AcknowledgeableEventStoreEvent) {
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
