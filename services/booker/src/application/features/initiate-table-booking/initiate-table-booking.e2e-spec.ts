import { AppModule } from '@/app.module';
import { mockedConfigService } from '@/test/mocked-config-service';
import { INestApplication } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { clearSagaSubscriptions } from '@/test/clear-saga-subscriptions';
import { v4 as uuidv4 } from 'uuid';

describe('Book table E2E - /bookings/initiate (POST)', () => {
  let testingModule: TestingModule;
  let app: INestApplication;

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockedConfigService)
      .compile();

    app = testingModule.createNestApplication();

    await clearSagaSubscriptions(app);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
