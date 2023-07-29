import { defer, firstValueFrom, retry } from 'rxjs';

export const retryWithDelay = <T>(
  fn: () => Promise<T>,
  config: {
    delay: number;
    count?: number;
  },
): Promise<T> => {
  return firstValueFrom(
    defer(fn).pipe(
      retry({
        delay: config.delay,
        count: config.count ?? 8,
      }),
    ),
  );
};
