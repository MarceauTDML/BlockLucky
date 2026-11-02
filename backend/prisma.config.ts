import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://etherbay_admin:etherbay_password@localhost:5434/blocklucky_db?schema=public',
  },
});
