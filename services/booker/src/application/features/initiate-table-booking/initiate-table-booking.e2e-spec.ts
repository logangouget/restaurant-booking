import { INestApplication } from '@nestjs/common/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { AppModule } from '@/app.module';

describe('Book table E2E - /bookings/initiate (POST)', () => {
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

  describe('Initiate booking', () => {
    const tableName = uuidv4();

    it('should book a table', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableName,
          timeSlot: {
            from: new Date(),
            to: new Date(),
          },
        })
        .expect(201);
    });
  });

  describe('Initiate a table booking for a table that is already booked', () => {
    const tableName = uuidv4();

    const timeSlot = {
      from: new Date(),
      to: new Date(),
    };

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableName,
          timeSlot,
        })
        .expect(201);
    });

    it('should return 400', async () => {
      await request(app.getHttpServer())
        .post('/booking/initiate')
        .send({
          tableId: tableName,
          timeSlot,
        })
        .expect(409);
    });
  });
});
