import { AppModule } from '@/app.module';
import { TableEventStoreRepository } from '@/infrastructure/repository/table.event-store.repository';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/table.event-store.repository.interface';
import { clearSagaSubscriptions } from '@/test/clear-saga-subscriptions';
import { mockedConfigService } from '@/test/mocked-config-service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import {
  JSONMetadata,
  TableBookingInitiatedEvent,
  TableLockPlacementFailedEvent,
  parseTableLockPlacedEventData,
  parseTableLockPlacementFailedEventData,
} from '@rb/events';
import { TableBaseEvent } from '@rb/events/dist/table/table-base-event';
import { filter, firstValueFrom, map, take, tap } from 'rxjs';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Place table lock E2E - Table locking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;
  let tableEventStoreRepository: TableEventStoreRepository;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockedConfigService)
      .compile();

    app = testingModule.createNestApplication();

    await clearSagaSubscriptions(app);

    await app.init();

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
    tableEventStoreRepository = app.get<TableEventStoreRepository>(
      TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
    );
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('When a booking is initiated for a table', () => {
    describe('And the table exists', () => {
      const tableId = uuid();
      const correlationId = uuid();
      const timeSlot = {
        from: new Date(),
        to: new Date(),
      };

      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/tables')
          .send({ name: tableId, numberOfSeats: 4 })
          .expect(201);

        const event = new TableBookingInitiatedEvent(
          {
            tableId,
            id: uuid(),
            timeSlot,
          },
          {
            correlationId: correlationId,
          },
        );

        await eventStoreDbService.publish(event);
      });

      it('should lock the table', async () => {
        const source$ =
          await eventStoreDbService.initPersistentSubscriptionToStream(
            TableBaseEvent.buildStreamName(tableId),
            `table-${tableId}-lock`,
          );

        const tableLockedPlacedEvent = await firstValueFrom(
          source$.pipe(
            tap(async (event) => {
              await event.ack();
            }),
            filter((event) => event.type === 'table-lock-placed'),
            map((event) => ({
              original: event,
              data: parseTableLockPlacedEventData(event.data),
              metadata: event.metadata as JSONMetadata,
            })),
            take(1),
          ),
        );

        const table = await tableEventStoreRepository.findTableById(tableId);

        expect(table.locks).toHaveLength(1);
        expect(tableLockedPlacedEvent.data).toMatchObject({
          id: tableId,
          timeSlot,
        });
        expect(tableLockedPlacedEvent.metadata).toMatchObject({
          $correlationId: correlationId,
        });
      });
    });

    describe('And the table does not exist', () => {
      const tableId = uuid();
      const correlationId = uuid();
      const timeSlot = {
        from: new Date(),
        to: new Date(),
      };

      beforeEach(async () => {
        const event = new TableBookingInitiatedEvent(
          {
            tableId: tableId,
            id: uuid(),
            timeSlot,
          },
          {
            correlationId,
          },
        );

        await eventStoreDbService.publish(event);
      });

      it('should not lock the table and emit a failure', async () => {
        const source$ =
          await eventStoreDbService.initPersistentSubscriptionToStream(
            TableLockPlacementFailedEvent.STREAM_NAME,
            `table_lock_placement_failed`,
          );

        const failureEvent = await firstValueFrom(
          source$.pipe(
            map((event) => ({
              original: event,
              data: parseTableLockPlacementFailedEventData(event.data),
              metadata: event.metadata as JSONMetadata,
            })),
            filter((event) => event.data.tableId === tableId),
            take(1),
            tap(async (event) => {
              await event.original.ack();
            }),
          ),
        );

        expect(failureEvent.data).toMatchObject({
          tableId,
          timeSlot,
        });
        expect(failureEvent.metadata).toMatchObject({
          $correlationId: correlationId,
        });
      });
    });
  });
});
