export class ListAvailableBookingSlotsQuery {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly people: number,
  ) {}
}

export type ListAvailableBookingSlotsQueryResult = {
  startDate: Date;
  endDate: Date;
  people: number;
  availabilities: Array<{
    day: string;
    slots: Array<{
      startTime: string;
      endTime: string;
      availableTables: string[];
    }>;
  }>;
};
