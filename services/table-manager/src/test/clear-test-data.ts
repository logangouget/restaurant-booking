import { INestApplication } from '@nestjs/common';
import { clearDatabase } from './clear-database';
import { clearSagaSubscriptions } from './clear-saga-subscriptions';
import { clearProjections } from './clear-projections';

export const clearTestData = async (app: INestApplication) => {
  await clearDatabase(app);
  await clearSagaSubscriptions(app);
  await clearProjections(app);
};
