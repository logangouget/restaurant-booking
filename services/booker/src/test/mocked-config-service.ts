import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const mockConfigServiceGet = (app: INestApplication) => {
  const configService = app.get<ConfigService>(ConfigService);

  const originalGet = configService.get.bind(configService);

  jest.spyOn(configService, 'get').mockImplementation((key: string) => {
    switch (key) {
      case 'TABLE_PROJECTION_GROUP_NAME':
        return 'booker_table_projection_group_name';
      case 'BOOKING_PROJECTION_GROUP_NAME':
        return 'booker_booking_projection_group_name';
      default:
        return originalGet(key);
    }
  });
};
