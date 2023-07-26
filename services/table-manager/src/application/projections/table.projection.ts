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
  TableEvent,
  TableEventType,
  parseTableAddedEventData,
  parseTableLockPlacedEventData,
  parseTableRemovedEventData,
} from '@rb/events';
import { eq } from 'drizzle-orm';
import { concatMap, groupBy, mergeMap } from 'rxjs';

@Injectable()
export class TableProjection {
  private readonly logger = new Logger(TableProjection.name);

  constructor(
    @Inject(DB)
    private readonly db: DbType,
    @Inject(EVENT_STORE_SERVICE)
    private readonly eventStoreDbService: EventStoreService,
    private readonly configService: ConfigService,
  ) {}

  async init() {
    this.logger.log('Initializing TableProjection');

    const streamName = '$ce-table';

    const groupName = this.configService.get<string>(
      'TABLE_PROJECTION_GROUP_NAME',
    );

    const source$ =
      await this.eventStoreDbService.initPersistentSubscriptionToStream(
        streamName,
        groupName,
      );

    source$
      .pipe(
        groupBy((event) => (event.data as TableEvent['data']).id),
        mergeMap((group$) =>
          group$.pipe(concatMap((event) => this.handleEvent(event))),
        ),
      )
      .subscribe();
  }

  private async handleEvent(resolvedEvent: AcknowledgeableEventStoreEvent) {
    this.logger.debug(`Handling event: ${resolvedEvent.type}`);

    try {
      switch (resolvedEvent.type as TableEventType) {
        case 'table-added':
          await this.onTableAdded(resolvedEvent);
          break;
        case 'table-removed':
          await this.onTableRemoved(resolvedEvent);
          break;
        case 'table-lock-placed':
          await this.onTableLockPlaced(resolvedEvent);
          break;
        case 'table-lock-removed':
          await this.onTableLockRemoved(resolvedEvent);
          break;
        default:
          this.logger.warn(`Unhandled event type: ${resolvedEvent.type}`);
      }
    } catch (error) {
      this.logger.error(error, error.stack);
    }
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
      this.logger.warn(`Table not found: ${eventData.id}`);
      await resolvedEvent.nack('retry', 'Table not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      this.logger.warn('Table revision mismatch', {
        tableId: eventData.id,
        currentRevision: table.revision,
        eventRevision: resolvedEvent.revision,
      });
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
      this.logger.warn(`Table not found: ${eventData.id}`);
      await resolvedEvent.nack('retry', 'Table not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      this.logger.warn('Table revision mismatch', {
        tableId: eventData.id,
        currentRevision: table.revision,
        eventRevision: resolvedEvent.revision,
      });
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

  private async onTableLockRemoved(
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
      this.logger.warn(`Table not found: ${eventData.id}`);
      await resolvedEvent.nack('retry', 'Table not found');
      return;
    }

    const table = tableResults[0];

    if (table.revision + 1 !== resolvedEvent.revision) {
      this.logger.warn('Table revision mismatch', {
        tableId: eventData.id,
        currentRevision: table.revision,
        eventRevision: resolvedEvent.revision,
      });
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
