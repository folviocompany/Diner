import { randomUUID } from 'node:crypto';
import { Permissoes } from '../../domain/services/Permissoes.js';

export class AcaoAuditadaUseCase {
  constructor(uow) {
    this.uow = uow;
  }
  executar(usuario, acao, dados, work) {
    Permissoes.exigir(usuario, acao);
    return this.uow.transaction(async (tx) => {
      const antes = acao.startsWith('comandas.') && dados.id ? await tx.pedidos.buscarPorId(dados.id) : null;
      const result = await work(tx);
      const seguros = JSON.parse(
        JSON.stringify({ entrada: dados, ...(antes ? { antes } : {}) }, (key, value) =>
          /senha|password|token|secret|hash/i.test(key) ? undefined : value,
        ),
      );
      await tx.auditoria.registrar({
        id: randomUUID(),
        usuarioId: usuario.id,
        usuarioNome: usuario.nome,
        acao,
        recursoId: result?.id ?? dados.id ?? null,
        dados: seguros,
        ocorridoEm: new Date(),
      });
      return result;
    });
  }
}
