import { EventStoreDBClient } from '@eventstore/db-client';

export const deleteExistingPersistentSubscription = async (
  client: EventStoreDBClient,
  streamName: string,
  groupName: string,
) => {
  const currentSubscriptions = await client.listAllPersistentSubscriptions();

  const existingTest = currentSubscriptions.find(
    (sub) => sub.groupName === groupName && sub.eventSource === streamName,
  );

  if (existingTest) {
    await client.deletePersistentSubscriptionToStream(streamName, groupName);
  }
};
