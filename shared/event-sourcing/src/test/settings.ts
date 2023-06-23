import { PersistentSubscriptionToStreamSettings } from '@eventstore/db-client';

export const defaultPersistentSubscriptionSettings: PersistentSubscriptionToStreamSettings =
  {
    checkPointAfter: 2000,
    checkPointLowerBound: 10,
    checkPointUpperBound: 1000,
    consumerStrategyName: 'RoundRobin',
    extraStatistics: false,
    historyBufferSize: 500,
    liveBufferSize: 500,
    maxRetryCount: 10,
    maxSubscriberCount: 'unbounded',
    messageTimeout: 30000,
    readBatchSize: 20,
    resolveLinkTos: true,
    startFrom: 'start',
  };
