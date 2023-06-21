export class InvalidTableIdException extends Error {
  constructor(id: string) {
    super(`Invalid table id: ${id}`);
  }
}
