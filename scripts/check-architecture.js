import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith('.js')) {
      const content = await readFile(path, 'utf8');
      if (
        /(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*(?:@prisma|infra\/|interfaces\/|shared\/container)/.test(
          content,
        )
      )
        throw new Error(`Dependência de infraestrutura proibida: ${path}`);
    }
  }
}
await check('src/domain');
await check('src/application');
console.log('Arquitetura validada: domain e application não dependem de infraestrutura.');
