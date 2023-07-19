import { INestApplication } from '@nestjs/common';
import { clearDatabase } from './clear-database';
import { clearSagaSubscriptions } from './clear-saga-subscriptions';
import { clearProjections } from './clear-projections';

export const clearTestData = async (
  app: INestApplication,
  options?: {
    clearProjections?: boolean;
    clearSagasSubscriptions?: boolean;
  },
) => {
  await Promise.all([
    clearDatabase(app),
    ...(options?.clearSagasSubscriptions ? [clearSagaSubscriptions(app)] : []),
    ...(options?.clearProjections ? [clearProjections(app)] : []),
  ]);
};
