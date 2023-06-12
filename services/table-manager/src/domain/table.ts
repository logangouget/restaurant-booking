import { AggregateRoot } from '@nestjs/cqrs';
import { TableEvent } from 'src/infrastructure/repository/table.event-store.repository.interface';
import {
  TableAddedEvent,
  TableRemovedEvent,
  TableUpdatedEvent,
} from '@rb/events';

export class Table extends AggregateRoot {
  constructor(private readonly id: string, private readonly seats: number) {
    super();
  }

  updateSeats(seats: number) {
    if (seats < 0) throw new Error('Seats must be greater than 0');
    this.apply(new TableUpdatedEvent(this.id, seats));
  }

  add() {
    this.apply(new TableAddedEvent(this.id, this.seats));
  }

  remove() {
    this.apply(new TableRemovedEvent(this.id));
  }

  getUncommittedEvents(): TableEvent[] {
    return super.getUncommittedEvents() as TableEvent[];
  }
}
