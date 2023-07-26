import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  JSONMetadata,
  TableEventType,
  TableLockPlacementFailedEvent,
} from '@rb/events';
import { merge, mergeMap } from 'rxjs';
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
        mergeMap((events) => events),
        mergeMap((event) => this.handleEvent(event)),
      )
      .subscribe();
  }

  private async handleEvent(resolvedEvent: AcknowledgeableEventStoreEvent) {
    this.logger.debug(`Handling event: ${resolvedEvent.type}`);

    try {
      switch (
        resolvedEvent.type as
          | TableEventType
          | TableLockPlacementFailedEvent['type']
      ) {
        case 'table-lock-placed':
          await this.onTableLockPlaced(resolvedEvent);
          break;
        case 'table-lock-placement-failed':
          await this.onTableLockPlacementFailed(resolvedEvent);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${resolvedEvent.type}`);
      }
    } catch (error) {
      this.logger.error(error, error.stack);
    }
  }

  async onTableLockPlacementFailed(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new CancelTableBookingCommand(eventMetadata.$correlationId);

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }

  async onTableLockPlaced(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new ConfirmTableBookingCommand(
      eventMetadata.$correlationId,
    );

    await this.commandBus.execute(command);

    await resolvedEvent.ack();
  }
}
