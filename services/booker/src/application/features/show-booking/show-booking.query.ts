export class ShowBookingQuery {
  constructor(public readonly id: string) {}
}

export type ShowBookingQueryResult = {
  id: string;
  timeSlotFrom: Date;
  timeSlotTo: Date;
  tableId: string;
  status: 'initiated' | 'cancelled' | 'confirmed';
};
