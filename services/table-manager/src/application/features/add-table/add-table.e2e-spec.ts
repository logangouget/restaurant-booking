import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Add table E2E - /tables (POST)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule());
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('Validation errors', () => {
    it('should send a 400 status code when table id property is missing', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ seats: 4 })
        .expect(400);
    });

    it('should send a 400 status code when table id is empty', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: '', seats: 4 })
        .expect(400);
    });

    it('should send a 400 status code when seats property is missing', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: '' })
        .expect(400);
    });
  });

  describe('Adding a table', () => {
    const tableId = uuidv4();

    it('should add a table', async () => {
      const response = await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(201);

      expect(response.body).toEqual({ id: tableId });
    });
  });

  describe('Adding a table that already exists', () => {
    const tableId = uuidv4();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(201);
    });

    it('/tables (POST)', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ id: tableId, seats: 4 })
        .expect(409);
    });
  });
});
