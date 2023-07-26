import {
  defaultIfEmpty,
  lastValueFrom,
  mergeMap,
  takeUntil,
  timer,
} from 'rxjs';
import { EventStoreDbService } from 'src/store';

export const ackAllPersistentSubscriptionEvents = async (
  eventStoreService: EventStoreDbService,
  {
    streamName,
    groupName,
  }: {
    streamName: string;
    groupName: string;
  },
) => {
  const source$ = await eventStoreService.initPersistentSubscriptionToStream(
    streamName,
    groupName,
  );

  await lastValueFrom(
    source$.pipe(
      takeUntil(timer(200)),
      mergeMap((event) => event.ack()),
      defaultIfEmpty(null),
    ),
  );
};
