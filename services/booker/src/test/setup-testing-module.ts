import { AppModule } from '@/app.module';
import { clearTestData } from './clear-test-data';
import { mockLogger } from './mock-logger';
import { mockConfigServiceGet } from './mocked-config-service';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { TableProjection } from '@/application/projections/table.projection';
import { TableBookingSaga } from '@/application/sagas/table-booking.saga';
import { BookingProjection } from '@/application/projections/booking.projection';
import { ConfigService } from '@nestjs/config';

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

      const configService = app.get(ConfigService);

      const ENABLE_TEST_LOGS = configService.get('ENABLE_TEST_LOGS');

      if (ENABLE_TEST_LOGS) {
        app.useLogger(new Logger());
      }

      mockConfigServiceGet(app);
      mockLogger(app);

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
