import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EventStoreService, EVENT_STORE_SERVICE } from '@rb/event-sourcing';
import { TableBookingCancelledEvent, TableLockPlacedEvent } from '@rb/events';
import { v4 as uuid } from 'uuid';
import * as request from 'supertest';

describe('Remove table lock E2E - Table locking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;
  let tableEventStoreRepository: TableEventStoreRepository;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule());

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
    tableEventStoreRepository = app.get<TableEventStoreRepository>(
      TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
    );
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('When a table lock is placed and a booking is cancelled', () => {
    const tableId = uuid();
    const timeSlotFrom = new Date();

    const timeSlot = {
      from: timeSlotFrom,
      to: new Date(timeSlotFrom.getTime() + 24 * 60 * 60 * 1000),
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(201);

      await eventStoreDbService.publish(
        new TableLockPlacedEvent({
          id: tableId,
          timeSlot,
        }),
      );

      await eventStoreDbService.publish(
        new TableBookingCancelledEvent({
          id: uuid(),
          tableId,
          timeSlot,
        }),
      );
    });

    it('should remove the lock', async () => {
      await retryWithDelay(
        async () => {
          const table = await tableEventStoreRepository.findTableById(tableId);

          expect(table.locks).toHaveLength(0);
        },
        {
          delay: 1000,
          maxRetries: 5,
        },
      );
    });
  });
});
