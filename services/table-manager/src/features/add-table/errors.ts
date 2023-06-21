export class TableAlreadyExistsError extends Error {
  constructor(id: string) {
    super(`Table with id ${id} already exists`);
  }
}
