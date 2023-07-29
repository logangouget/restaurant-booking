import { EventStoreService } from '@rb/event-sourcing';
import { lastValueFrom, toArray } from 'rxjs';

export const getAllStreamEvents = async (
  eventStoreService: EventStoreService,
  streamName: string,
) => {
  return lastValueFrom(
    eventStoreService.readStream(streamName).pipe(toArray()),
  );
};
