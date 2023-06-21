import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AddTableModule } from './features/add-table/add-table.module';
import { EventStoreModule } from '@rb/event-sourcing';
import { RemoveTableModule } from './features/remove-table/remove-table.module';

@Module({
  imports: [EventStoreModule, AddTableModule, RemoveTableModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
