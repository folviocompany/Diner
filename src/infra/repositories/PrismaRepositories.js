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

const include = { itens: true, pagamentos: true };
function plain(value) {
  if (value === null || value === undefined || value instanceof Date) return value;
  if (typeof value?.toNumber === 'function') return value.toNumber();
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
}

export class PrismaPedidoRepository extends PedidoRepository {
  async buscarPorChave(chaveIdempotencia) {
    return plain(await this.db.pedido.findUnique({ where: { chaveIdempotencia }, include }));
  }
  async editarComanda(id, versao, data, adicionar, remover) {
    const result = await this.db.pedido.updateMany({
      where: { id, versao },
      data: { ...data, versao: { increment: 1 } },
    });
    if (!result.count) throw new ConflitoError('Comanda atualizada por outra pessoa. Recarregue.');
    if (remover.length) await this.db.itemPedido.deleteMany({ where: { pedidoId: id, id: { in: remover } } });
    if (adicionar.length)
      await this.db.itemPedido.createMany({ data: adicionar.map((item) => ({ ...item, pedidoId: id })) });
    return this.buscarPorId(id);
  }
  constructor(db) {
    super();
    this.db = db;
  }
  async criar({ itens, pagamentos = [], ...data }) {
    const cliente = data.clienteNome
      ? { create: { nome: data.clienteNome, contato: data.clienteContato } }
      : undefined;
    return plain(
      await this.db.pedido.create({
        data: { ...data, cliente, itens: { create: itens }, pagamentos: { create: pagamentos } },
        include,
      }),
    );
  }
  async buscarPorId(id) {
    return plain(await this.db.pedido.findUnique({ where: { id }, include }));
  }
  async buscarReferenciasPorIds(ids) {
    return plain(
      await this.db.pedido.findMany({
        where: { id: { in: ids } },
        select: { id: true, numero: true, origem: true },
      }),
    );
  }
  async buscarPorExterno(externoId) {
    return plain(await this.db.pedido.findUnique({ where: { externoId }, include }));
  }
  async listar({ origem, status, busca, inicio, fim, page = 1, limit = 30 } = {}) {
    const where = {
      ...(origem ? { origem } : {}),
      ...(status === 'ativos'
        ? { status: { in: ['recebido', 'preparando', 'pronto'] } }
        : status
          ? { status }
          : {}),
      ...(inicio || fim
        ? { criadoEm: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lt: fim } : {}) } }
        : {}),
      ...(busca
        ? {
            OR: [
              { clienteNome: { contains: busca } },
              { mesa: { contains: busca } },
              ...(/^\d+$/.test(busca) ? [{ numero: Number(busca) }] : []),
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.db.pedido.findMany({
        where,
        include,
        orderBy: { numero: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.pedido.count({ where }),
    ]);
    return { data: plain(data), total, page, limit };
  }
  async buscarPorPeriodo(inicio, fim) {
    return plain(
      await this.db.pedido.findMany({
        where: {
          OR: [{ status: 'concluido' }, { status: 'cancelado', preservarReceita: true }],
          concluidoEm: { gte: inicio, lt: fim },
        },
        include,
      }),
    );
  }
  async atualizar(id, data) {
    return plain(
      await this.db.pedido.update({ where: { id }, data: { ...data, versao: { increment: 1 } }, include }),
    );
  }
}
export class PrismaProdutoRepository extends ProdutoRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  listar() {
    return this.db.produto.findMany({ orderBy: [{ categoria: 'asc' }, { nome: 'asc' }] });
  }
  buscarPorId(id) {
    return this.db.produto.findUnique({ where: { id } });
  }
  salvar(data) {
    return this.db.produto.upsert({ where: { id: data.id }, create: data, update: data });
  }
}
export class PrismaCaixaRepository extends CaixaRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  atual() {
    return this.db.caixa.findUnique({ where: { chaveAberto: 'principal' } });
  }
  buscarPorId(id) {
    return this.db.caixa.findUnique({ where: { id } });
  }
  listar() {
    return this.db.caixa.findMany({ orderBy: { abertoEm: 'desc' }, take: 50 });
  }
  salvar(data) {
    return this.db.caixa.upsert({ where: { id: data.id }, create: data, update: data });
  }
  pagamentos(caixaId) {
    return this.db.pagamento.findMany({ where: { caixaId } });
  }
  movimentos(caixaId) {
    return this.db.movimentoCaixa.findMany({ where: { caixaId }, orderBy: { criadoEm: 'desc' } });
  }
  movimentar(data) {
    return this.db.movimentoCaixa.create({ data });
  }
}
export class PrismaFinanceiroRepository extends FinanceiroRepository {
  estornarPagamento(id, estornadoEm) {
    return this.db.pagamento.update({ where: { id }, data: { status: 'estornado', estornadoEm } });
  }
  criarReembolso(data) {
    return this.db.reembolso.upsert({ where: { pagamentoId: data.pagamentoId }, create: data, update: {} });
  }
  buscarReembolso(id) {
    return this.db.reembolso.findUnique({ where: { id } });
  }
  reembolsosPendentes() {
    return this.db.reembolso.findMany({ where: { confirmadoEm: null }, orderBy: { criadoEm: 'asc' } });
  }
  confirmarReembolso(id, data) {
    return this.db.reembolso.update({ where: { id }, data });
  }
  criarAjuste(data) {
    return this.db.ajusteFinanceiro.upsert({ where: { pedidoId: data.pedidoId }, create: data, update: {} });
  }
  ajustes(inicio, fim) {
    return this.db.ajusteFinanceiro.findMany({
      where: { ocorridoEm: { gte: inicio, lt: fim } },
      orderBy: { ocorridoEm: 'desc' },
    });
  }
  constructor(db) {
    super();
    this.db = db;
  }
  pagar(data) {
    return this.db.pagamento.create({ data });
  }
  buscarPagamento(chaveIdempotencia) {
    return this.db.pagamento.findUnique({ where: { chaveIdempotencia } });
  }
  despesas(inicio, fim) {
    return this.db.despesa.findMany({
      where: { ocorridoEm: { gte: inicio, lt: fim } },
      orderBy: { ocorridoEm: 'desc' },
    });
  }
  criarDespesa(data) {
    return this.db.despesa.create({ data });
  }
}
export class PrismaEventoRepository extends EventoRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  async registrar(eventos) {
    const result = await this.db.eventoIfood.createMany({ data: eventos, skipDuplicates: true });
    return result.count;
  }
  async reivindicar(now) {
    const where = {
      OR: [
        { status: 'pendente', proximaTentativaEm: { lte: now } },
        { status: 'processando', bloqueadoAte: { lt: now } },
      ],
    };
    const event = await this.db.eventoIfood.findFirst({
      where,
      orderBy: [{ ocorridoEm: 'asc' }, { id: 'asc' }],
    });
    if (!event) return null;
    const tokenProcessamento = randomUUID();
    const changed = await this.db.eventoIfood.updateMany({
      where: { id: event.id, ...where, tentativas: event.tentativas },
      data: {
        status: 'processando',
        tokenProcessamento,
        tentativas: { increment: 1 },
        bloqueadoAte: new Date(now.getTime() + 60000),
      },
    });
    return changed.count ? this.db.eventoIfood.findUnique({ where: { id: event.id } }) : null;
  }
  async finalizar(id, tokenProcessamento, data) {
    const result = await this.db.eventoIfood.updateMany({
      where: { id, tokenProcessamento, status: 'processando' },
      data: { ...data, bloqueadoAte: null, tokenProcessamento: null },
    });
    if (!result.count) throw new ConflitoError('Evento já foi reivindicado por outro processo.');
  }
  listar() {
    return this.db.eventoIfood.findMany({
      orderBy: { recebidoEm: 'desc' },
      take: 100,
      omit: { payload: true, tokenProcessamento: true },
    });
  }
  async reprocessar(id, now) {
    return (
      await this.db.eventoIfood.updateMany({
        where: { id, status: { in: ['falhou', 'pendente'] } },
        data: { status: 'pendente', tentativas: 0, proximaTentativaEm: now, erro: null },
      })
    ).count;
  }
}
export class PrismaUsuarioRepository extends UsuarioRepository {
  listar() {
    return this.db.usuario.findMany({ orderBy: { nome: 'asc' }, omit: { senhaHash: true } });
  }
  buscarPorId(id) {
    return this.db.usuario.findUnique({ where: { id } });
  }
  atualizar(id, data) {
    return this.db.usuario.update({ where: { id }, data });
  }
  invalidarSessoes(usuarioId) {
    return this.db.sessao.deleteMany({ where: { usuarioId } });
  }
  constructor(db) {
    super();
    this.db = db;
  }
  buscarPorEmail(email) {
    return this.db.usuario.findUnique({ where: { email } });
  }
  salvar(data) {
    return this.db.usuario.upsert({ where: { email: data.email }, create: data, update: {} });
  }
  criarSessao(data) {
    return this.db.sessao.create({ data });
  }
  buscarSessao(tokenHash) {
    return this.db.sessao.findUnique({ where: { tokenHash }, include: { usuario: true } });
  }
  excluirSessao(tokenHash) {
    return this.db.sessao.deleteMany({ where: { tokenHash } });
  }
}

export class PrismaUnitOfWork extends UnitOfWork {
  constructor(db, inside = false) {
    super();
    this.db = db;
    this.inside = inside;
    this.pedidos = new PrismaPedidoRepository(db);
    this.produtos = new PrismaProdutoRepository(db);
    this.caixas = new PrismaCaixaRepository(db);
    this.financeiro = new PrismaFinanceiroRepository(db);
    this.eventos = new PrismaEventoRepository(db);
    this.usuarios = new PrismaUsuarioRepository(db);
    this.auditoria = new PrismaAuditoriaRepository(db);
  }
  async transaction(work) {
    if (this.inside) return work(this);
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction((tx) => work(new PrismaUnitOfWork(tx, true)), {
          isolationLevel: 'Serializable',
          timeout: 20000,
        });
      } catch (error) {
        if (error.code === 'P2034' && attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt));
          continue;
        }
        if (error.code === 'P2002')
          throw new ConflitoError('Já existe um registro com este identificador ou um caixa aberto.');
        throw error;
      }
    }
  }
}
export class PrismaAuditoriaRepository extends AuditoriaRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  registrar(data) {
    return this.db.auditoria.create({ data });
  }
  listar({ page = 1, limit = 30 } = {}) {
    return this.db.auditoria.findMany({
      orderBy: [{ ocorridoEm: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
