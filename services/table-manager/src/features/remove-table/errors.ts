export class TableNotFoundError extends Error {
  constructor(id: string) {
    super(`Table with id ${id} not found`);
  }
}
