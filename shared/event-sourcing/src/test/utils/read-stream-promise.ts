import { EventType, ResolvedEvent, StreamingRead } from '@eventstore/db-client';

export const streamToPromise = async (
  stream: StreamingRead<ResolvedEvent<EventType>>,
) => {
  const events: ResolvedEvent<EventType>[] = [];

  for await (const event of stream) {
    events.push(event);
  }

  return events;
};
