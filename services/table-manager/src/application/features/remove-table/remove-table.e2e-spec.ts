import { getFutureDate } from '@/test/get-future-date';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { TableLockPlacedEvent } from '@rb/events';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Remove table E2E - /tables (DELETE)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));
    eventStoreService =
      testingModule.get<EventStoreService>(EVENT_STORE_SERVICE);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('Validation errors', () => {
    it('should send a 400 status code when id is missing', async () => {
      await request(app.getHttpServer()).post('/tables/');
    });
  });

  describe('Removing a table', () => {
    const tableId = uuidv4();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(201);
    });

    it('should remove table', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${tableId}`)
        .expect(200);
    });
  });

  describe('Removing a locked table', () => {
    it('should return 404', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${uuidv4()}`)
        .expect(404);
    });
  });

  describe('Removing a table that has been locked', () => {
    const tableId = uuidv4();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(201);

      await eventStoreService.publish(
        new TableLockPlacedEvent({
          id: tableId,
          timeSlot: {
            from: new Date(),
            to: getFutureDate(1),
          },
        }),
      );
    });

    it('should return 409', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${tableId}`)
        .expect(409);
    });
  });
});
