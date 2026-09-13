import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'src/infra/prisma/schema.prisma',
  migrations: { path: 'src/infra/prisma/migrations', seed: 'node src/infra/prisma/seed.js' },
  datasource: { url: process.env.DATABASE_URL ?? 'mysql://diner:diner_local@127.0.0.1:3306/diner' },
});
