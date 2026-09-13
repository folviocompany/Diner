import { readFile } from 'node:fs/promises';
import mariadb from 'mariadb';
const config = JSON.parse(
  await readFile(new URL('../.local/root-credentials.json', import.meta.url), 'utf8'),
);
const connection = await mariadb.createConnection({
  host: '127.0.0.1',
  allowPublicKeyRetrieval: true,
  port: config.port,
  user: config.user,
  password: config.password,
});
try {
  await connection.query('SHUTDOWN');
  console.log('MySQL local encerrado.');
} finally {
  await connection.end();
}
