import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const mockLogger = (app: INestApplication) => {
  const configService = app.get(ConfigService);

  const ENABLE_TEST_LOGS = configService.get('ENABLE_TEST_LOGS');

  if (ENABLE_TEST_LOGS) {
    return;
  }

  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
    return;
  });
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {
    return;
  });
  jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {
    return;
  });
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
    return;
  });
  jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {
    return;
  });
};
