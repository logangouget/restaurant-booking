import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  JSONMetadata,
  parseTableLockPlacedEventData,
  parseTableLockPlacementFailedEventData,
} from '@rb/events';
import { concatMap, merge } from 'rxjs';
import { CancelTableBookingCommand } from '../features/cancel-table-booking/cancel-table-booking.command';
import { ConfirmTableBookingCommand } from '../features/confirm-table-booking/confirm-table-booking.command';

@Injectable()
export class TableBookingSaga {
  private readonly logger = new Logger(TableBookingSaga.name);

  constructor(
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    this.logger.log('Initializing TableBookingSaga');

    const tableLockPlacedStreamName = '$et-table-lock-placed';
    const tableLockPlacedGroupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_LOCK_PLACED_GROUP_NAME',
    );
    const tableLockPlacementFailedStreamName =
      '$et-table-lock-placement-failed';
    const tableLockPlacementFailedGroupName = this.configService.get<string>(
      'TABLE_BOOKING_SAGA_LOCK_PLACEMENT_FAILED_GROUP_NAME',
    );

    const sources$ = await Promise.all([
      this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockPlacedStreamName,
        tableLockPlacedGroupName,
      ),
      this.eventStoreDbService.initPersistentSubscriptionToStream(
        tableLockPlacementFailedStreamName,
        tableLockPlacementFailedGroupName,
      ),
    ]);

    merge(sources$)
      .pipe(
        concatMap((events) => events),
        concatMap((event) => this.handleEvent(event)),
      )
      .subscribe();
  }

  private async handleEvent(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const type = resolvedEvent.type;

    this.logger.debug(`Handling event: ${type}`);

    try {
      switch (type) {
        case 'table-lock-placed':
          await this.onTableLockPlaced(resolvedEvent);
          break;
        case 'table-lock-placement-failed':
          await this.onTableLockPlacementFailed(resolvedEvent);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${type}`);
      }
    } catch (error) {
      this.logger.error(error);
    }
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

  async onTableLockPlaced(resolvedEvent: AcknowledgeableEventStoreEvent) {
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
