import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import { JSONMetadata, parseTableBookingInitiatedEventData } from '@rb/events';
import { TableNotFoundError } from '../errors';
import { PlaceTableLockCommand } from '../features/place-table-lock/place-table-lock.command';

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
  }

  async onTableBookingInitiated(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableBookingInitiatedEventData(resolvedEvent.data);

    const eventMetadata = resolvedEvent.metadata as JSONMetadata;

    const command = new PlaceTableLockCommand(
      eventData.tableId,
      {
        from: new Date(eventData.timeSlot.from),
        to: new Date(eventData.timeSlot.to),
      },
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
}
