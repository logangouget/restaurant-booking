import { TimeSlot } from '@/domain/table';

export class ScheduleTableLockRemovalCommand {
  constructor(
    public readonly tableId: string,
    public readonly timeSlot: TimeSlot,
    public readonly correlationId: string,
  ) {}
}
