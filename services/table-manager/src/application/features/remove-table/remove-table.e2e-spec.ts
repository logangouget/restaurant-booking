import { INestApplication } from '@nestjs/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '@/app.module';

describe('Add table E2E - /tables (DELETE)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await testingModule.close();
  });

  describe('Validation errors', () => {
    it('should send a 400 status code when id is missing', async () => {
      await request(app.getHttpServer()).post('/tables/');
    });
  });

  describe('Removing a table', () => {
    const tableName = uuidv4();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: tableName, numberOfSeats: 4 })
        .expect(201);
    });

    it('should remove table', async () => {
      await request(app.getHttpServer())
        .delete(`/tables/${tableName}`)
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
