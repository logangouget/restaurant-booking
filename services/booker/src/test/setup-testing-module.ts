import { AppModule } from '@/app.module';
import { clearTestData } from './clear-test-data';
import { mockLogger } from './mock-logger';
import { mockConfigServiceGet } from './mocked-config-service';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TableProjection } from '@/application/projections/table.projection';
import { TableBookingSaga } from '@/application/sagas/table-booking.saga';
import { BookingProjection } from '@/application/projections/booking.projection';

const createSetupFunction = () => {
  let cached: {
    testingModule: TestingModule;
    app: INestApplication;
  } | null = null;

  return async (options?: {
    disableProjections?: boolean;
    disableSagas?: boolean;
  }): Promise<{
    testingModule: TestingModule;
    app: INestApplication;
  }> => {
    if (!cached) {
      const testingModuleBuilder = Test.createTestingModule({
        imports: [AppModule],
      });

      if (options?.disableProjections) {
        testingModuleBuilder.overrideProvider(TableProjection).useValue({
          init: jest.fn(),
        });
        testingModuleBuilder.overrideProvider(BookingProjection).useValue({
          init: jest.fn(),
        });
      }

      if (options?.disableSagas) {
        testingModuleBuilder.overrideProvider(TableBookingSaga).useValue({
          init: jest.fn(),
        });
      }

      const testingModule = await testingModuleBuilder.compile();

      const app = testingModule.createNestApplication();

      mockConfigServiceGet(app);
      mockLogger();

      await clearTestData(app);

      await app.init();

      cached = { testingModule, app };

      return cached;
    }

    await clearTestData(cached.app);

    return cached;
  };
};

export const setupTestingModule = createSetupFunction();
