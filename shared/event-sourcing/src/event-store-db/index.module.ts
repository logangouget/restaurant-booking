import { Module } from "@nestjs/common";
import { EventStoreDBClient } from "@eventstore/db-client";

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
