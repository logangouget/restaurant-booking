import { v4 as uuid } from 'uuid';

export const mockedConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'TABLE_BOOKING_SAGA_GROUP_NAME':
        return `test-${uuid()}`;
      case 'EVENT_STORE_ENDPOINT':
        return 'localhost:2113';
      case 'EVENT_STORE_INSECURE':
        return true;
      default:
        throw new Error(`Key ${key} not found`);
    }
  }),
};
