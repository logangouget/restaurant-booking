import { Type } from '@nestjs/common';
import { AggregateRoot, IEventHandler } from '@nestjs/cqrs';
import { TableAddedEvent, TableEvent, TableRemovedEvent } from '@rb/events';

export class Table extends AggregateRoot<TableEvent> {
  public seats: number;

  constructor(public id: string) {
    super();
  }

  add(seats: number) {
    this.apply(new TableAddedEvent(this.id, seats));
  }

  remove() {
    this.apply(new TableRemovedEvent(this.id));
  }

  getUncommittedEvents(): TableEvent[] {
    return super.getUncommittedEvents() as TableEvent[];
  }

  private onTableAddedEvent(event: TableAddedEvent) {
    this.id = event.data.id;
    this.seats = event.data.seats;
  }

  protected getEventHandler<T extends TableEvent>(
    event: T,
  ): Type<IEventHandler<T>> {
    switch (event.type) {
      case 'table-added':
        return this.onTableAddedEvent.bind(this);
      default:
        throw new Error(`Cannot find event handler for ${event.type}`);
    }
  }

  static fromEventsHistory(events: TableEvent[]) {
    const table = new Table(events[0].data.id);

    for (const event of events) {
      table.apply(event, true);
    }

    return table;
  }
}
