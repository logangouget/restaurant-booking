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
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bull';

describe('Remove table lock E2E - Table locking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;
  let tableEventStoreRepository: TableEventStoreRepository;
  let removeTableLockQueue: Queue;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
    tableEventStoreRepository = app.get<TableEventStoreRepository>(
      TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
    );
    removeTableLockQueue = app.get<Queue>(getQueueToken('remove-table-lock'));
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('When a table lock is placed and a booking is cancelled', () => {
    const tableId = uuid();
    const timeSlotFrom = new Date();
    const correlationId = uuid();

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
        new TableLockPlacedEvent(
          {
            id: tableId,
            timeSlot,
          },
          {
            correlationId,
          },
        ),
      );

      await retryWithDelay(
        async () => {
          const job = await removeTableLockQueue.getJob(correlationId);
          expect(job).not.toBeNull();
        },
        {
          delay: 1000,
          maxRetries: 5,
        },
      );

      await eventStoreDbService.publish(
        new TableBookingCancelledEvent(
          {
            id: uuid(),
            tableId,
            timeSlot,
          },
          {
            correlationId,
          },
        ),
      );
    });

    it('should remove the lock and scheduled lock removal', async () => {
      await retryWithDelay(
        async () => {
          const table = await tableEventStoreRepository.findTableById(tableId);
          const job = await removeTableLockQueue.getJob(correlationId);

          expect(job).toBeNull();
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
