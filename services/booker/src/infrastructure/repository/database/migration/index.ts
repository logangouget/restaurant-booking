import { NestFactory } from '@nestjs/core';
import { MigrationModule } from './migration.module';
import { MigrationService } from './migration-service';

async function bootstrap() {
  const app = await NestFactory.create(MigrationModule);

  const migrationService = app.get(MigrationService);

  await migrationService.migrate();

  await app.close();

  process.exit(0);
}
bootstrap();
