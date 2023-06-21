import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AddTableModule } from './features/add-table/add-table.module';
import { EventStoreModule } from '@rb/event-sourcing';

@Module({
  imports: [EventStoreModule, AddTableModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
