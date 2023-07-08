import { AppModule } from '@/app.module';
import { TableEventStoreRepository } from '@/infrastructure/repository/table.event-store.repository';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/table.event-store.repository.interface';
import { mockedConfigService } from '@/test/mocked-config-service';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EventStoreDbService } from '@rb/event-sourcing';
import { TableBookingInitiatedEvent } from '@rb/events';
import { TableBaseEvent } from '@rb/events/dist/table/table-base-event';
import { filter, firstValueFrom, take } from 'rxjs';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Place table lock E2E - Table locking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreDbService;
  let tableEventStoreRepository: TableEventStoreRepository;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockedConfigService)
      .compile();

    app = testingModule.createNestApplication();
    await app.init();

    eventStoreDbService = app.get<EventStoreDbService>(EventStoreDbService);
    tableEventStoreRepository = app.get<TableEventStoreRepository>(
      TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
    );
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  describe('When a booking is initiated for a table', () => {
    const tableId = uuid();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: tableId, numberOfSeats: 4 })
        .expect(201);

      const event = new TableBookingInitiatedEvent(
        {
          tableId: tableId,
          id: uuid(),
          timeSlot: {
            from: new Date(),
            to: new Date(),
          },
        },
        {
          correlationId: 'correlation-1',
        },
      );

      await eventStoreDbService.publish(event);
    });

    it('should lock the table', async () => {
      const { source$ } =
        await eventStoreDbService.initPersistentSubscriptionToStream(
          TableBaseEvent.buildStreamName(tableId),
          `table-${tableId}-lock`,
        );

      const tableLockedPlacedEvent = await firstValueFrom(
        source$.pipe(
          filter((event) => event.event.type === 'table-lock-placed'),
          take(1),
        ),
      );

      const table = await tableEventStoreRepository.findTableById(tableId);

      expect(table.locks).toHaveLength(1);
      expect(tableLockedPlacedEvent.event.data).toMatchObject({
        id: tableId,
        timeSlot: {
          from: expect.any(String),
          to: expect.any(String),
        },
      });
      expect(tableLockedPlacedEvent.event.metadata).toMatchObject({
        $correlationId: 'correlation-1',
      });
    });
  });
});
