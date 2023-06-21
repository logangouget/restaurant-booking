import { INestApplication } from '@nestjs/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '../../app.module';

describe('Add table E2E - /tables (POST)', () => {
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
    it('should send a 400 status code when table name property is missing', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ numberOfSeats: 4 })
        .expect(400);
    });

    it('should send a 400 status code when table name is empty', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: '', numberOfSeats: 4 })
        .expect(400);
    });

    it('should send a 400 status code when numberOfSeats property is missing', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('Adding a table', () => {
    const tableName = uuidv4();

    it('should add a table', async () => {
      const response = await request(app.getHttpServer())
        .post('/tables')
        .send({ name: tableName, numberOfSeats: 4 })
        .expect(201);

      expect(response.body).toEqual({ id: tableName });
    });
  });

  describe('Adding a table that already exists', () => {
    const tableName = uuidv4();

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: tableName, numberOfSeats: 4 })
        .expect(201);
    });

    it('/tables (POST)', async () => {
      await request(app.getHttpServer())
        .post('/tables')
        .send({ name: tableName, numberOfSeats: 4 })
        .expect(409);
    });
  });
});
