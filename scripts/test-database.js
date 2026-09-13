import { spawnSync } from 'node:child_process';
import 'dotenv/config';
const url = process.env.TEST_DATABASE_URL ?? 'mysql://diner_test:diner_test@127.0.0.1:3307/diner_test';
if (!new URL(url).pathname.endsWith('_test'))
  throw new Error('O nome do banco de teste deve terminar em _test.');
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
process.exitCode = result.status ?? 1;
