import { EventStoreDBClient } from '@eventstore/db-client';
import { streamToPromise } from './read-stream-promise';

export const deleteExistingStream = async (
  client: EventStoreDBClient,
  streamName: string,
): Promise<void> => {
  try {
    const stream = client.readStream(streamName);
    const events = await streamToPromise(stream);

    if (events.length > 0) {
      await client.deleteStream(streamName);
    }
  } catch (error) {}
};
