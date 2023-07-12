export const mockedConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'TABLE_BOOKING_SAGA_LOCK_PLACEMENT_FAILED_GROUP_NAME':
        return `TABLE_BOOKING_SAGA_LOCK_PLACEMENT_FAILED_GROUP_NAME`;
      case 'TABLE_BOOKING_SAGA_LOCK_PLACED_GROUP_NAME':
        return `TABLE_BOOKING_SAGA_LOCK_PLACED_GROUP_NAME`;
      case 'EVENT_STORE_ENDPOINT':
        return 'localhost:2113';
      case 'EVENT_STORE_INSECURE':
        return true;
      default:
        throw new Error(`Key ${key} not found`);
    }
  }),
};
