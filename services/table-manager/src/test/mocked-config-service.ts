export const mockedConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    switch (key) {
      case 'TABLE_LOCKING_SAGA_GROUP_NAME':
        return `table-locking-saga-group-name`;
      case 'EVENT_STORE_ENDPOINT':
        return 'localhost:2113';
      case 'EVENT_STORE_INSECURE':
        return true;
      default:
        throw new Error(`Key ${key} not found`);
    }
  }),
};
