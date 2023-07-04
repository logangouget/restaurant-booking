import { AggregateRoot as NestAggregateRoot } from '@nestjs/cqrs';

export class AggregateRoot extends NestAggregateRoot {
  getUncommittedEvents() {
    return super.getUncommittedEvents();
  }
}
