import { TimeSlot } from '@/domain/table';

export class PlaceTableLockCommand {
  constructor(
    public readonly id: string,
    public readonly timeSlot: TimeSlot,
    public readonly correlationId: string,
  ) {}
}
