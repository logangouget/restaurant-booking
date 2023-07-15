import { INestApplication } from '@nestjs/common';
import { clearDatabase } from './clear-database';
import { clearSagaSubscriptions } from './clear-saga-subscriptions';
import { clearProjections } from './clear-projections';

export const clearTestData = async (app: INestApplication) => {
  await Promise.all([
    clearDatabase(app),
    clearSagaSubscriptions(app),
    clearProjections(app),
  ]);
};
