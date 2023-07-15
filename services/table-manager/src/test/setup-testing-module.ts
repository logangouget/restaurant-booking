import { AppModule } from '@/app.module';
import { clearTestData } from './clear-test-data';
import { mockLogger } from './mock-logger';
import { mockConfigServiceGet } from './mocked-config-service';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

export const setupTestingModule = async (): Promise<{
  testingModule: TestingModule;
  app: INestApplication;
}> => {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = testingModule.createNestApplication();

  mockConfigServiceGet(app);
  mockLogger();

  await clearTestData(app);

  await app.init();

  return { testingModule, app };
};
