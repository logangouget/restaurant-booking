import { defer, firstValueFrom, retry } from 'rxjs';

export const retryWithDelay = <T>(
  fn: () => Promise<T>,
  config?: {
    count?: number;
    delay?: number;
  },
): Promise<T> => {
  return firstValueFrom(
    defer(fn).pipe(
      retry({
        count: config?.count ?? 8,
        delay: config?.delay ?? 1000,
      }),
    ),
  );
};
