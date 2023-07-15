import { Logger } from '@nestjs/common';

export const mockLogger = () => {
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
