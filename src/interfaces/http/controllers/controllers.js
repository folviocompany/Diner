import * as s from '../schemas.js';
import { NaoEncontradoError, DomainError } from '../../../shared/errors/DomainError.js';
import { periodoRelatorio } from '../../../domain/services/periodos.js';

export function criarControllers(c) {
  const id = (req) => s.idSchema.parse(req.params.id);
  return {
    produtos: async (_req, res) => res.json(await c.uow.produtos.listar()),
    salvarProduto: async (req, res) =>
      res
        .status(req.params.id ? 200 : 201)
        .json(
          await c.salvarProduto.executar({
            ...s.produtoSchema.parse(req.body),
            ...(req.params.id ? { id: id(req) } : {}),
          }),
        ),
    pedidos: async (req, res) => {
      const { data, ...query } = s.listaSchema.parse(req.query);
      const periodo = data ? periodoRelatorio({ data, timezone: c.config.timezone }) : {};
      res.json(await c.uow.pedidos.listar({ ...query, inicio: periodo.inicio, fim: periodo.fim }));
    },
    pedido: async (req, res) => {
      const pedido = await c.uow.pedidos.buscarPorId(id(req));
      if (!pedido) throw new NaoEncontradoError('Pedido');
      res.json(pedido);
    },
    criarPedido: async (req, res) =>
      res.status(201).json(await c.criarPedido.executar(s.pedidoSchema.parse(req.body))),
    status: async (req, res) =>
      res.json(await c.atualizarStatus.executar({ id: id(req), ...s.statusSchema.parse(req.body) })),
    pagamento: async (req, res) =>
      res
        .status(201)
        .json(
          await c.registrarPagamento.executar({
            pedidoId: id(req),
            ...s.pagamentoSchema.parse(req.body),
            chaveIdempotencia: s.chaveSchema.parse(req.headers['idempotency-key']),
          }),
        ),
    caixaAtual: async (_req, res) => res.json(await c.consultarCaixa.executar()),
    caixas: async (_req, res) => res.json(await c.uow.caixas.listar()),
    caixa: async (req, res) => res.json(await c.consultarCaixa.executar(id(req))),
    abrirCaixa: async (req, res) =>
      res.status(201).json(await c.abrirCaixa.executar(s.abrirCaixaSchema.parse(req.body))),
    fecharCaixa: async (req, res) =>
      res.json(await c.fecharCaixa.executar({ id: id(req), ...s.fecharCaixaSchema.parse(req.body) })),
    movimentarCaixa: async (req, res) =>
      res.status(201).json(await c.movimentarCaixa.executar(s.movimentoSchema.parse(req.body))),
    despesa: async (req, res) =>
      res.status(201).json(await c.registrarDespesa.executar(s.despesaSchema.parse(req.body))),
    relatorio: async (req, res) => res.json(await c.relatorio.executar(s.relatorioSchema.parse(req.query))),
    exportar: async (req, res) => {
      const report = await c.relatorio.executar(s.relatorioSchema.parse(req.query));
      const linhas = [
        ['Data', 'Pedidos', 'Receita (BRL)', 'Custos e despesas (BRL)', 'Lucro (BRL)'],
        ...report.serie.map((d) => [
          d.data,
          d.pedidos,
          (d.receitaCentavos / 100).toFixed(2),
          (d.custosCentavos / 100).toFixed(2),
          (d.lucroCentavos / 100).toFixed(2),
        ]),
      ];
      res
        .attachment('diner-relatorio.csv')
        .type('text/csv; charset=utf-8')
        .send('\uFEFF' + linhas.map((l) => l.join(';')).join('\r\n'));
    },
    eventos: async (_req, res) => res.json(await c.uow.eventos.listar()),
    reprocessar: async (req, res) => {
      const changed = await c.uow.transaction((tx) => tx.eventos.reprocessar(id(req), new Date()));
      if (!changed)
        throw new DomainError(
          'Evento não encontrado ou indisponível para reprocessamento.',
          'EVENTO_INDISPONIVEL',
          409,
        );
      res.status(202).json({ reprocessamentoAgendado: true });
    },
  };
}
