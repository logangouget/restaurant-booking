import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import { firstValueFrom, mergeMap, retry, timer } from 'rxjs';
import * as request from 'supertest';
import { v4 as uuid } from 'uuid';
import { ListTablesResponse } from './dto/list-tables.response';

describe('List tables E2E - /tables (GET)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule());
  });

  afterAll(async () => {
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
      await request(app.getHttpServer())
        .post('/tables')
        .send({
          id: table1Id,
          seats: 4,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/tables')
        .send({
          id: table2Id,
          seats: 6,
        })
        .expect(201);
    });

    it('should return all tables', async () => {
      // We need to retry the assertion because the projection is eventually consistent
      await retryAssertion(async () => {
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
      await request(app.getHttpServer())
        .post('/tables')
        .send({
          id: table1Id,
          seats: 4,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/tables/${table1Id}`)
        .expect(200);
    });

    it('should not return the removed table', async () => {
      // We need to retry the assertion because the projection is eventually consistent
      await retryAssertion(async () => {
        const tableResponse = await listTables(app);

        expect(tableResponse).toEqual({
          tables: [],
        });
      });
    });
  });
});

async function retryAssertion(assertionFn: () => Promise<void>) {
  const maxRetries = 5;
  const retryDelay = 1000;

  return firstValueFrom(
    timer(0, retryDelay).pipe(
      mergeMap(() => assertionFn()),
      retry(maxRetries),
    ),
  );
}

async function listTables(app: INestApplication): Promise<ListTablesResponse> {
  return request(app.getHttpServer())
    .get('/tables')
    .expect(200)
    .then((response) => response.body);
}
