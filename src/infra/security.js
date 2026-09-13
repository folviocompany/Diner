import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);

export const security = {
  async hashSenha(senha) {
    const salt = randomBytes(16).toString('hex');
    const hash = await derive(senha, salt, 64);
    return `${salt}:${hash.toString('hex')}`;
  },
  async verificarSenha(senha, encoded) {
    const [salt, digest] = (encoded ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
    const hash = await derive(senha, salt, 64);
    const saved = Buffer.from(digest, 'hex');
    return saved.length === hash.length && timingSafeEqual(hash, saved);
  },
  novoToken: () => randomBytes(32).toString('hex'),
  hashToken: (token) => createHash('sha256').update(token).digest('hex'),
};
