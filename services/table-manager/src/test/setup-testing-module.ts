import { AppModule } from '@/app.module';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { clearTestData } from './clear-test-data';
import { mockConfigServiceGet } from './mocked-config-service';
import { mockLogger } from './mock-logger';

const createSetupFunction = () => {
  let cached: {
    testingModule: TestingModule;
    app: INestApplication;
  } | null = null;

  return async (): Promise<{
    testingModule: TestingModule;
    app: INestApplication;
  }> => {
    if (!cached) {
      const testingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

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
