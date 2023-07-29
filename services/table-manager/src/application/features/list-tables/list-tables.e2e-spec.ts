import { retryWithDelay } from '@/test/retry-with-delay';
import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ListTablesResponse } from './dto/list-tables.response';
import { EVENT_STORE_SERVICE, EventStoreService } from '@rb/event-sourcing';
import { TableAddedEvent, TableRemovedEvent } from '@rb/events';

describe('List tables E2E - /tables (GET)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;
  let eventStoreService: EventStoreService;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableSagas: true,
    }));

    eventStoreService = app.get(EVENT_STORE_SERVICE);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('when no table exists', () => {
    it('should return empty array when no tables exist', async () => {
      await request(app.getHttpServer()).get('/tables').expect(200).expect({
        tables: [],
      });
    });
  });

  describe('when tables exist', () => {
    const table1Id = uuid();
    const table2Id = uuid();

    beforeEach(async () => {
      await eventStoreService.publish(
        new TableAddedEvent({
          id: table1Id,
          seats: 4,
        }),
      );

      await eventStoreService.publish(
        new TableAddedEvent({
          id: table2Id,
          seats: 6,
        }),
      );
    });

    it('should return all tables', async () => {
      // We need to retry the assertion because the projection is eventually consistent
      await retryWithDelay(async () => {
        const tables = await listTables(app);

        expect(tables).toEqual({
          tables: [
            {
              id: table1Id,
              seats: 4,
            },
            {
              id: table2Id,
              seats: 6,
            },
          ],
        });
      });
    });
  });

  describe('when a table has been added and removed', () => {
    const table1Id = uuid();

    beforeEach(async () => {
      await eventStoreService.publish(
        new TableAddedEvent({
          id: table1Id,
          seats: 4,
        }),
      );

      await eventStoreService.publish(new TableRemovedEvent(table1Id));
    });

    it('should not return the removed table', async () => {
      // We need to retry the assertion because the projection is eventually consistent
      await retryWithDelay(async () => {
        const tableResponse = await listTables(app);

        expect(tableResponse).toEqual({
          tables: [],
        });
      });
    });
  });
});

async function listTables(app: INestApplication): Promise<ListTablesResponse> {
  return request(app.getHttpServer())
    .get('/tables')
    .expect(200)
    .then((response) => response.body);
}
