import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MigrationService } from './migration-service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [MigrationService],
})
export class MigrationModule {}
