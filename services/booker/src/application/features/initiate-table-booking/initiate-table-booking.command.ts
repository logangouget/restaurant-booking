export class InitiateTableBookingCommand {
  constructor(
    public readonly tableId: string,
    public readonly timeSlot: {
      from: Date;
      to: Date;
    },
  ) {}
}
