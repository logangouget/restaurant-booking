import { setupTestingModule } from '@/test/setup-testing-module';
import { INestApplication } from '@nestjs/common/interfaces';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

describe('Book table E2E - /bookings/initiate (POST)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeEach(async () => {
    ({ testingModule, app } = await setupTestingModule());
  });

  afterAll(async () => {
    await testingModule.close();
  });

  describe('Initiate booking', () => {
    const tableId = uuidv4();

    it('should book a table', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableId,
          timeSlot: {
            from: new Date(),
            to: new Date(),
          },
        })
        .expect(201);
    });
  });

  describe('Initiate a table booking for a table that is already booked', () => {
    const tableId = uuidv4();

    const timeSlot = {
      from: new Date(),
      to: new Date(),
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableId,
          timeSlot,
        })
        .expect(201);
    });

    it('should return 400', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableId,
          timeSlot,
        })
        .expect(409);
    });
  });
});
