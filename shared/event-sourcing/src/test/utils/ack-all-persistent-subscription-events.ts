import { takeUntil, timer } from 'rxjs';
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

  return new Promise<void>((resolve, reject) => {
    const subscription = source$.pipe(takeUntil(timer(500))).subscribe({
      next: async (event) => {
        await event.ack();
      },
      error: (error) => {
        subscription.unsubscribe();
        reject(error);
      },
      complete: () => {
        subscription.unsubscribe();
        resolve();
      },
    });
  });
};
