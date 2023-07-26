export class TableBookingNotFoundError extends Error {
  constructor(id: string) {
    super(`Table booking with id ${id} not found`);
  }
}
