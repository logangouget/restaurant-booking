import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Remove table E2E - /tables (DELETE)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule({
      disableProjections: true,
    }));
  });

  afterAll(async () => {
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

  describe('Removing a table that does not exist', () => {
    it('should return 404', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${uuidv4()}`)
        .expect(404);
    });
  });
});
