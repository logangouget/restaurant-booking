import { TableEvent } from '@rb/events';
import { Table } from '@/domain/table';

export const TABLE_EVENT_STORE_REPOSITORY_INTERFACE =
  'TABLE_EVENT_STORE_REPOSITORY_INTERFACE';

export interface TableEventStoreRepositoryInterface {
  findTableById(id: string): Promise<Table | null>;
  publish(events: TableEvent[]): Promise<void>;
}
