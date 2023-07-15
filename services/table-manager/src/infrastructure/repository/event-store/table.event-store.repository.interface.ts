import { Table } from '@/domain/table';
import { Event } from '@rb/events';

export const TABLE_EVENT_STORE_REPOSITORY_INTERFACE =
  'TABLE_EVENT_STORE_REPOSITORY_INTERFACE';

export interface TableEventStoreRepositoryInterface {
  findTableById(id: string): Promise<Table | null>;
  publish(events: Event<unknown, unknown>[]): Promise<void>;
}
