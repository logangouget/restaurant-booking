import { defer, firstValueFrom, retry } from 'rxjs';

export const retryWithDelay = <T>(
  fn: () => Promise<T>,
  config: {
    maxRetries: number;
    delay: number;
  },
): Promise<T> => {
  return firstValueFrom(
    defer(fn).pipe(
      retry({
        count: config.maxRetries,
        delay: config.delay,
      }),
    ),
  );
};
