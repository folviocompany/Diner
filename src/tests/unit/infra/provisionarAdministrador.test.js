import { describe, expect, it, vi } from 'vitest';
import { provisionarAdministrador } from '../../../infra/prisma/provisionarAdministrador.js';

function banco(quantidade = 0) {
  return {
    usuario: {
      count: vi.fn().mockResolvedValue(quantidade),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('provisionamento do administrador', () => {
  it('cria o primeiro administrador com senha protegida', async () => {
    const db = banco();
    await expect(
      provisionarAdministrador(db, {
        ADMIN_EMAIL: ' ADMIN@DINER.LOCAL ',
        ADMIN_PASSWORD: 'SenhaSegura123!',
      }),
    ).resolves.toBe(true);
    const dados = db.usuario.upsert.mock.calls[0][0].create;
    expect(dados).toMatchObject({ email: 'admin@diner.local', nome: 'Administrador' });
    expect(dados.senhaHash).not.toContain('SenhaSegura123!');
  });

  it('preserva usuários existentes sem exigir a senha do ambiente', async () => {
    const db = banco(1);
    await expect(provisionarAdministrador(db, {})).resolves.toBe(false);
    expect(db.usuario.upsert).not.toHaveBeenCalled();
  });

  it('explica a configuração ausente quando a tabela está vazia', async () => {
    await expect(provisionarAdministrador(banco(), {})).rejects.toThrow('ADMIN_PASSWORD');
  });
});
