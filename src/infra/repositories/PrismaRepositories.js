import { randomUUID } from 'node:crypto';
import {
  PedidoRepository,
  ProdutoRepository,
  CaixaRepository,
  FinanceiroRepository,
  EventoRepository,
  UsuarioRepository,
  UnitOfWork,
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
        where: { status: 'concluido', concluidoEm: { gte: inicio, lt: fim } },
        include,
      }),
    );
  }
  async atualizar(id, data) {
    return plain(await this.db.pedido.update({ where: { id }, data, include }));
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
  buscarPorCodigo(codigoExterno) {
    return this.db.produto.findUnique({ where: { codigoExterno } });
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
  estornar(pedidoId, estornadoEm) {
    return this.db.pagamento.updateMany({
      where: { pedidoId, status: 'confirmado' },
      data: { status: 'estornado', estornadoEm },
    });
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
