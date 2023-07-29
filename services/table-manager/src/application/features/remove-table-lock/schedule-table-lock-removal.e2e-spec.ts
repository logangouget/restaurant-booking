import { TableEventStoreRepository } from '@/infrastructure/repository/event-store/table.event-store.repository';
import { TABLE_EVENT_STORE_REPOSITORY_INTERFACE } from '@/infrastructure/repository/event-store/table.event-store.repository.interface';
import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { EventStoreService, EVENT_STORE_SERVICE } from '@rb/event-sourcing';
import { TableLockPlacedEvent } from '@rb/events';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';

describe('Schedule table lock removal E2E - Table locking saga', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreDbService: EventStoreService;
  let tableEventStoreRepository: TableEventStoreRepository;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));

    eventStoreDbService = app.get<EventStoreService>(EVENT_STORE_SERVICE);
    tableEventStoreRepository = app.get<TableEventStoreRepository>(
      TABLE_EVENT_STORE_REPOSITORY_INTERFACE,
    );
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('When a table lock is placed', () => {
    const tableId = uuid();
    const timeSlotFrom = new Date();

    const timeSlot = {
      from: timeSlotFrom,
      to: new Date(timeSlotFrom.getTime() + 1000),
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
    });

    it('should remove the lock', async () => {
      await retryWithDelay(async () => {
        const table = await tableEventStoreRepository.findTableById(tableId);

        expect(table.locks).toHaveLength(0);
      });
    });
  });
});
