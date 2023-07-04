import { TimeSlot } from '@/domain/table-booking';

export class InitiateTableBookingCommand {
  constructor(
    public readonly tableId: string,
    public readonly timeSlot: TimeSlot,
  ) {}
}
