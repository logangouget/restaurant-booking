import { Table, TimeSlot } from '@/domain/table';

export class RemoveTableLockCommand {
  constructor(
    public readonly tableId: string,
    public readonly timeSlot: TimeSlot,
    public readonly correlationId: string,
  ) {}
}

export type RemoveTableLockCommandResult = Table;
