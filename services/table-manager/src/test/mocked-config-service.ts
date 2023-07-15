import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const mockConfigServiceGet = (app: INestApplication) => {
  const configService = app.get<ConfigService>(ConfigService);

  const originalGet = configService.get.bind(configService);

  jest.spyOn(configService, 'get').mockImplementation((key: string) => {
    switch (key) {
      case 'TABLE_LOCKING_SAGA_GROUP_NAME':
        return `table-locking-saga-group-name`;
      default:
        return originalGet(key);
    }
  });
};
