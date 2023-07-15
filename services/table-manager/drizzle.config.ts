import type { Config } from 'drizzle-kit';

export default {
  schema: './src/infrastructure/repository/database/schemas/*.ts',
  out: './drizzle',
} satisfies Config;
