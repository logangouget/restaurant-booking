import {
  DB,
  DbType,
} from '@/infrastructure/repository/database/database.module';
import { tables } from '@/infrastructure/repository/database/schemas';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { AcknowledgeableEventStoreEvent } from '@rb/event-sourcing/dist/store/acknowledgeable-event-store-event';
import {
  TableEventType,
  parseTableAddedEventData,
  parseTableLockPlacedEventData,
  parseTableRemovedEventData,
} from '@rb/events';
import { eq } from 'drizzle-orm';

@Injectable()
export class TableProjection {
  constructor(
    @Inject(DB)
    private readonly db: DbType,
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    const logger = new Logger('TableProjection');

    logger.debug('Initializing TableProjection');

    const streamName = '$ce-table';

    const groupName = this.configService.get<string>(
      'TABLE_PROJECTION_GROUP_NAME',
    );

    const source$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$.subscribe(async (resolvedEvent) => {
      try {
        const type = resolvedEvent.type as TableEventType;
        switch (type) {
          case 'table-added':
            await this.onTableAdded(resolvedEvent);
            break;
          case 'table-removed':
            await this.onTableRemoved(resolvedEvent);
            break;
          case 'table-lock-placed':
            await this.onTableLockPlaced(resolvedEvent);
            break;
        }
      } catch (error) {
        logger.error(error);
      }
    });
  }

  private async onTableAdded(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableAddedEventData(resolvedEvent.data);

    const currentTable = await this.db
      .select({
        id: tables.id,
      })
      .from(tables)
      .where(eq(tables.id, eventData.id));

    if (currentTable.length > 0) {
      await resolvedEvent.ack();
      return;
    }

    await this.db.insert(tables).values({
      id: eventData.id,
      seats: eventData.seats,
      revision: resolvedEvent.revision,
    });

    await resolvedEvent.ack();
  }

  private async onTableRemoved(resolvedEvent: AcknowledgeableEventStoreEvent) {
    const eventData = parseTableRemovedEventData(resolvedEvent.data);

    const tableResults = await this.db
      .select({
        revision: tables.revision,
      })
      .from(tables)
      .where(eq(tables.id, eventData.id));

    if (tableResults.length === 0) {
      await resolvedEvent.nack('retry', 'Table not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      await resolvedEvent.nack('retry', 'Table revision mismatch');
      return;
    }

    await this.db
      .update(tables)
      .set({
        removedAt: resolvedEvent.createdAt,
        revision: resolvedEvent.revision,
      })
      .where(eq(tables.id, eventData.id))
      .returning({
        updatedId: tables.id,
        removed: tables.removedAt,
      });

    await resolvedEvent.ack();
  }

  private async onTableLockPlaced(
    resolvedEvent: AcknowledgeableEventStoreEvent,
  ) {
    const eventData = parseTableLockPlacedEventData(resolvedEvent.data);

    const tableResults = await this.db
      .select({
        revision: tables.revision,
      })
      .from(tables)
      .where(eq(tables.id, eventData.id));

    if (tableResults.length === 0) {
      await resolvedEvent.nack('retry', 'Table not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      await resolvedEvent.nack('retry', 'Table revision mismatch');
      return;
    }

    await this.db
      .update(tables)
      .set({
        revision: resolvedEvent.revision,
      })
      .where(eq(tables.id, eventData.id));

    await resolvedEvent.ack();
  }
}