import { randomUUID } from 'node:crypto';
import {
  PedidoRepository,
  ProdutoRepository,
  CaixaRepository,
  FinanceiroRepository,
  EventoRepository,
  UsuarioRepository,
  UnitOfWork,
  AuditoriaRepository,
} from '../../domain/repositories/contratos.js';
import { ConflitoError } from '../../shared/errors/DomainError.js';

const copy = (value) => structuredClone(value);
class MemoryPedidoRepository extends PedidoRepository {
  async buscarPorChave(chave) {
    const p = this.s.pedidos.find((p) => p.chaveIdempotencia === chave);
    return p ? this.buscarPorId(p.id) : null;
  }
  async editarComanda(id, versao, data, adicionar, remover) {
    const p = this.s.pedidos.find((p) => p.id === id);
    if ((p.versao ?? 0) !== versao)
      throw new ConflitoError('Comanda atualizada por outra pessoa. Recarregue.');
    Object.assign(p, copy(data), { versao: versao + 1 });
    p.itens = [
      ...p.itens.filter((i) => !remover.includes(i.id)),
      ...adicionar.map((i) => ({ id: randomUUID(), ...copy(i) })),
    ];
    return this.buscarPorId(id);
  }
  constructor(s) {
    super();
    this.s = s;
  }
  async criar({ itens, pagamentos = [], ...data }) {
    if (data.externoId && this.s.pedidos.some((p) => p.externoId === data.externoId))
      throw new ConflitoError();
    const pedido = {
      versao: 0,
      status: 'recebido',
      criadoEm: new Date(),
      ...copy(data),
      numero: ++this.s.numero,
      itens: itens.map((i) => ({ id: randomUUID(), ...copy(i) })),
    };
    this.s.pedidos.push(pedido);
    for (const p of pagamentos)
      this.s.pagamentos.push({ id: randomUUID(), recebidoEm: new Date(), ...copy(p), pedidoId: pedido.id });
    return this.buscarPorId(pedido.id);
  }
  async buscarPorId(id) {
    const p = this.s.pedidos.find((p) => p.id === id);
    return p ? copy({ ...p, pagamentos: this.s.pagamentos.filter((x) => x.pedidoId === id) }) : null;
  }
  async buscarReferenciasPorIds(ids) {
    const selecionados = new Set(ids);
    return this.s.pedidos
      .filter((pedido) => selecionados.has(pedido.id))
      .map(({ id, numero, origem }) => copy({ id, numero, origem }));
  }
  async buscarPorExterno(id) {
    const p = this.s.pedidos.find((p) => p.externoId === id);
    return p ? this.buscarPorId(p.id) : null;
  }
  async listar({ origem, status, busca, inicio, fim, page = 1, limit = 30 } = {}) {
    let data = this.s.pedidos.filter(
      (p) =>
        (!origem || p.origem === origem) &&
        (!status ||
          (status === 'ativos'
            ? ['recebido', 'preparando', 'pronto'].includes(p.status)
            : p.status === status)) &&
        (!inicio || p.criadoEm >= inicio) &&
        (!fim || p.criadoEm < fim),
    );
    if (busca)
      data = data.filter(
        (p) =>
          `${p.clienteNome ?? ''} ${p.mesa ?? ''}`.toLowerCase().includes(busca.toLowerCase()) ||
          String(p.numero) === busca,
      );
    return {
      data: await Promise.all(
        data
          .sort((a, b) => b.numero - a.numero)
          .slice((page - 1) * limit, page * limit)
          .map((p) => this.buscarPorId(p.id)),
      ),
      total: data.length,
      page,
      limit,
    };
  }
  async buscarPorPeriodo(inicio, fim) {
    return Promise.all(
      this.s.pedidos
        .filter(
          (p) =>
            (p.status === 'concluido' || p.preservarReceita) &&
            p.concluidoEm >= inicio &&
            p.concluidoEm < fim,
        )
        .map((p) => this.buscarPorId(p.id)),
    );
  }
  async atualizar(id, data) {
    const atual = this.s.pedidos.find((p) => p.id === id);
    atual.versao = (atual.versao ?? 0) + 1;
    Object.assign(atual, copy(data));
    return this.buscarPorId(id);
  }
}
class MemoryProdutoRepository extends ProdutoRepository {
  constructor(s) {
    super();
    this.s = s;
  }
  async listar() {
    return copy(
      [...this.s.produtos].sort(
        (a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome),
      ),
    );
  }
  async buscarPorId(id) {
    return copy(this.s.produtos.find((p) => p.id === id) ?? null);
  }
  async salvar(data) {
    if (
      data.codigoExterno &&
      this.s.produtos.some((p) => p.id !== data.id && p.codigoExterno === data.codigoExterno)
    )
      throw new ConflitoError('Código externo já utilizado.');
    const current = this.s.produtos.find((p) => p.id === data.id);
    if (current) Object.assign(current, copy(data));
    else this.s.produtos.push(copy(data));
    return this.buscarPorId(data.id);
  }
}
class MemoryCaixaRepository extends CaixaRepository {
  constructor(s) {
    super();
    this.s = s;
  }
  async atual() {
    return copy(this.s.caixas.find((c) => c.chaveAberto === 'principal') ?? null);
  }
  async buscarPorId(id) {
    return copy(this.s.caixas.find((c) => c.id === id) ?? null);
  }
  async listar() {
    return copy([...this.s.caixas].sort((a, b) => b.abertoEm - a.abertoEm).slice(0, 50));
  }
  async salvar(data) {
    if (data.chaveAberto && this.s.caixas.some((c) => c.id !== data.id && c.chaveAberto === data.chaveAberto))
      throw new ConflitoError();
    const c = this.s.caixas.find((c) => c.id === data.id);
    if (c) Object.assign(c, copy(data));
    else this.s.caixas.push(copy(data));
    return this.buscarPorId(data.id);
  }
  async pagamentos(id) {
    return copy(this.s.pagamentos.filter((p) => p.caixaId === id));
  }
  async movimentos(id) {
    return copy(this.s.movimentos.filter((p) => p.caixaId === id));
  }
  async movimentar(data) {
    this.s.movimentos.push(copy(data));
    return copy(data);
  }
}
class MemoryFinanceiroRepository extends FinanceiroRepository {
  async estornarPagamento(id, estornadoEm) {
    Object.assign(
      this.s.pagamentos.find((p) => p.id === id),
      { status: 'estornado', estornadoEm },
    );
  }
  async criarReembolso(data) {
    const old = this.s.reembolsos.find((r) => r.pagamentoId === data.pagamentoId);
    if (!old) this.s.reembolsos.push(copy(data));
    return copy(old ?? data);
  }
  async buscarReembolso(id) {
    return copy(this.s.reembolsos.find((r) => r.id === id) ?? null);
  }
  async reembolsosPendentes() {
    return copy(this.s.reembolsos.filter((r) => !r.confirmadoEm));
  }
  async confirmarReembolso(id, data) {
    const r = this.s.reembolsos.find((r) => r.id === id);
    Object.assign(r, copy(data));
    return copy(r);
  }
  async criarAjuste(data) {
    if (!this.s.ajustes.some((a) => a.pedidoId === data.pedidoId)) this.s.ajustes.push(copy(data));
  }
  async ajustes(inicio, fim) {
    return copy(this.s.ajustes.filter((a) => a.ocorridoEm >= inicio && a.ocorridoEm < fim));
  }
  constructor(s) {
    super();
    this.s = s;
  }
  async pagar(data) {
    if (await this.buscarPagamento(data.chaveIdempotencia)) throw new ConflitoError();
    this.s.pagamentos.push(copy(data));
    return copy(data);
  }
  async buscarPagamento(chave) {
    return copy(this.s.pagamentos.find((p) => chave && p.chaveIdempotencia === chave) ?? null);
  }
  async despesas(a, b) {
    return copy(
      this.s.despesas
        .filter((d) => d.ocorridoEm >= a && d.ocorridoEm < b)
        .sort((x, y) => y.ocorridoEm - x.ocorridoEm),
    );
  }
  async criarDespesa(data) {
    this.s.despesas.push(copy(data));
    return copy(data);
  }
}
class MemoryEventoRepository extends EventoRepository {
  constructor(s) {
    super();
    this.s = s;
  }
  async registrar(eventos) {
    let count = 0;
    for (const e of eventos)
      if (!this.s.eventos.some((x) => x.id === e.id)) {
        this.s.eventos.push({
          status: 'pendente',
          tentativas: 0,
          recebidoEm: new Date(),
          proximaTentativaEm: new Date(),
          ...copy(e),
        });
        count++;
      }
    return count;
  }
  async reivindicar(now) {
    const e = this.s.eventos
      .filter(
        (e) =>
          (e.status === 'pendente' && e.proximaTentativaEm <= now) ||
          (e.status === 'processando' && e.bloqueadoAte < now),
      )
      .sort((a, b) => a.ocorridoEm - b.ocorridoEm)[0];
    if (!e) return null;
    Object.assign(e, {
      status: 'processando',
      tokenProcessamento: randomUUID(),
      tentativas: e.tentativas + 1,
      bloqueadoAte: new Date(now.getTime() + 60000),
    });
    return copy(e);
  }
  async finalizar(id, token, data) {
    const e = this.s.eventos.find(
      (e) => e.id === id && e.tokenProcessamento === token && e.status === 'processando',
    );
    if (!e) throw new ConflitoError();
    Object.assign(e, copy(data), { tokenProcessamento: null, bloqueadoAte: null });
  }
  async listar() {
    return copy(
      [...this.s.eventos]
        .sort((a, b) => b.recebidoEm - a.recebidoEm)
        .slice(0, 100)
        .map(({ payload: _p, tokenProcessamento: _t, ...e }) => e),
    );
  }
  async reprocessar(id, now) {
    const e = this.s.eventos.find((e) => e.id === id && ['falhou', 'pendente'].includes(e.status));
    if (!e) return 0;
    Object.assign(e, { status: 'pendente', tentativas: 0, proximaTentativaEm: now, erro: null });
    return 1;
  }
}
class MemoryUsuarioRepository extends UsuarioRepository {
  async listar() {
    return copy(this.s.usuarios.map(({ senhaHash: _s, ...u }) => u));
  }
  async buscarPorId(id) {
    return copy(this.s.usuarios.find((u) => u.id === id) ?? null);
  }
  async atualizar(id, data) {
    const u = this.s.usuarios.find((u) => u.id === id);
    if (this.s.usuarios.some((x) => x.id !== id && x.email === data.email)) throw new ConflitoError();
    Object.assign(u, copy(data));
    return copy(u);
  }
  async invalidarSessoes(id) {
    this.s.sessoes = this.s.sessoes.filter((s) => s.usuarioId !== id);
  }
  constructor(s) {
    super();
    this.s = s;
  }
  async buscarPorEmail(email) {
    return copy(this.s.usuarios.find((u) => u.email === email) ?? null);
  }
  async salvar(data) {
    const old = await this.buscarPorEmail(data.email);
    if (old) return old;
    const user = { perfil: 'admin', ativo: true, ...copy(data) };
    this.s.usuarios.push(user);
    return copy(user);
  }
  async criarSessao(data) {
    this.s.sessoes.push(copy(data));
  }
  async buscarSessao(hash) {
    const s = this.s.sessoes.find((s) => s.tokenHash === hash);
    return s ? copy({ ...s, usuario: this.s.usuarios.find((u) => u.id === s.usuarioId) }) : null;
  }
  async excluirSessao(hash) {
    this.s.sessoes = this.s.sessoes.filter((s) => s.tokenHash !== hash);
  }
}
export class MemoryUnitOfWork extends UnitOfWork {
  constructor(state) {
    super();
    this.state = state ?? {
      numero: 0,
      pedidos: [],
      produtos: [],
      pagamentos: [],
      caixas: [],
      movimentos: [],
      despesas: [],
      eventos: [],
      usuarios: [],
      sessoes: [],
      auditorias: [],
      reembolsos: [],
      ajustes: [],
    };
    this.pedidos = new MemoryPedidoRepository(this.state);
    this.produtos = new MemoryProdutoRepository(this.state);
    this.caixas = new MemoryCaixaRepository(this.state);
    this.financeiro = new MemoryFinanceiroRepository(this.state);
    this.eventos = new MemoryEventoRepository(this.state);
    this.usuarios = new MemoryUsuarioRepository(this.state);
    this.auditoria = new MemoryAuditoriaRepository(this.state);
    this.queue = Promise.resolve();
  }
  async transaction(work) {
    const previous = this.queue;
    let release;
    this.queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const tx = new MemoryUnitOfWork(copy(this.state));
      const result = await work(tx);
      Object.assign(this.state, tx.state);
      return result;
    } finally {
      release();
    }
  }
}
class MemoryAuditoriaRepository extends AuditoriaRepository {
  constructor(s) {
    super();
    this.s = s;
  }
  async registrar(data) {
    this.s.auditorias.push(copy(data));
    return copy(data);
  }
  async listar({ page = 1, limit = 30 } = {}) {
    return copy([...this.s.auditorias].reverse().slice((page - 1) * limit, page * limit));
  }
}
