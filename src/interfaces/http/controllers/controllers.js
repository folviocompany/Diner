import * as s from '../schemas.js';
import { NaoEncontradoError, DomainError } from '../../../shared/errors/DomainError.js';
import { periodoRelatorio } from '../../../domain/services/periodos.js';
import { Permissoes } from '../../../domain/services/Permissoes.js';
import { criarCasoDeUso } from '../../../shared/container.js';

export function criarControllers(c) {
  const id = (req) => s.idSchema.parse(req.params.id);
  const executar = (req, acao, caso, dados) =>
    c.acaoAuditada.executar(req.usuario, acao, dados, (tx) =>
      criarCasoDeUso(caso, tx, c.config).executar(dados),
    );
  const visivel = (req, pedido) => {
    if (req.usuario.perfil !== 'cozinha') return pedido;
    const { id, numero, origem, status, mesa, observacao, criadoEm, itens } = pedido;
    return {
      id,
      numero,
      origem,
      status,
      mesa,
      observacao,
      criadoEm,
      itens: itens.map(({ id, nome, quantidade, observacao }) => ({ id, nome, quantidade, observacao })),
    };
  };
  return {
    produtos: async (_req, res) => res.json(await c.uow.produtos.listar()),
    salvarProduto: async (req, res) =>
      res.status(req.params.id ? 200 : 201).json(
        await executar(req, 'produtos.gerenciar', 'salvarProduto', {
          ...s.produtoSchema.parse(req.body),
          ...(req.params.id ? { id: id(req) } : {}),
        }),
      ),
    pedidos: async (req, res) => {
      const { data, ...query } = s.listaSchema.parse(req.query);
      const periodo = data ? periodoRelatorio({ data, timezone: c.config.timezone }) : {};
      const result = await c.uow.pedidos.listar({ ...query, inicio: periodo.inicio, fim: periodo.fim });
      res.json({ ...result, data: result.data.map((p) => visivel(req, p)) });
    },
    pedido: async (req, res) => {
      const pedido = await c.uow.pedidos.buscarPorId(id(req));
      if (!pedido) throw new NaoEncontradoError('Pedido');
      res.json(visivel(req, pedido));
    },
    criarPedido: async (req, res) => {
      const dados = s.pedidoSchema.parse(req.body);
      if (dados.descontoCentavos || dados.acrescimoCentavos || dados.taxasCentavos)
        Permissoes.exigir(req.usuario, 'pedidos.descontar');
      res.status(201).json(
        await executar(req, 'pedidos.criar', 'criarPedido', {
          ...dados,
          chaveIdempotencia: s.chaveSchema.parse(req.headers['idempotency-key']),
        }),
      );
    },
    status: async (req, res) => {
      const dados = { id: id(req), ...s.statusSchema.parse(req.body) };
      const acao =
        dados.status === 'cancelado'
          ? 'pedidos.cancelar'
          : dados.status === 'concluido'
            ? 'pedidos.concluir'
            : 'pedidos.preparar';
      res.json(visivel(req, await executar(req, acao, 'atualizarStatus', dados)));
    },
    editarComanda: async (req, res) => {
      const dados = { id: id(req), ...s.comandaSchema.parse(req.body) };
      if (dados.remover.length) Permissoes.exigir(req.usuario, 'comandas.retirar');
      res.json(await executar(req, 'comandas.editar', 'editarComanda', dados));
    },
    usuarios: async (_req, res) => res.json(await c.uow.usuarios.listar()),
    usuario: async (req, res) =>
      res.status(req.params.id ? 200 : 201).json(
        await executar(req, 'usuarios.gerenciar', 'gerenciarUsuario', {
          ...s.usuarioSchema.parse(req.body),
          ...(req.params.id ? { id: id(req) } : {}),
          atorPerfil: req.usuario.perfil,
        }),
      ),
    auditoria: async (req, res) => res.json(await c.uow.auditoria.listar(s.auditoriaSchema.parse(req.query))),
    reembolsos: async (_req, res) => res.json(await c.uow.financeiro.reembolsosPendentes()),
    confirmarReembolso: async (req, res) =>
      res.json(await executar(req, 'reembolsos.confirmar', 'confirmarReembolso', { id: id(req) })),
    pagamento: async (req, res) =>
      res.status(201).json(
        await executar(req, 'pagamentos.criar', 'registrarPagamento', {
          pedidoId: id(req),
          ...s.pagamentoSchema.parse(req.body),
          chaveIdempotencia: s.chaveSchema.parse(req.headers['idempotency-key']),
        }),
      ),
    caixaAtual: async (_req, res) => res.json(await c.consultarCaixa.executar()),
    caixas: async (_req, res) => res.json(await c.uow.caixas.listar()),
    caixa: async (req, res) => res.json(await c.consultarCaixa.executar(id(req))),
    abrirCaixa: async (req, res) =>
      res
        .status(201)
        .json(await executar(req, 'caixa.operar', 'abrirCaixa', s.abrirCaixaSchema.parse(req.body))),
    fecharCaixa: async (req, res) =>
      res.json(
        await executar(req, 'caixa.operar', 'fecharCaixa', {
          id: id(req),
          ...s.fecharCaixaSchema.parse(req.body),
        }),
      ),
    movimentarCaixa: async (req, res) =>
      res
        .status(201)
        .json(await executar(req, 'caixa.operar', 'movimentarCaixa', s.movimentoSchema.parse(req.body))),
    despesa: async (req, res) =>
      res
        .status(201)
        .json(await executar(req, 'despesas.criar', 'registrarDespesa', s.despesaSchema.parse(req.body))),
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
      const changed = await c.acaoAuditada.executar(
        req.usuario,
        'integracoes.gerenciar',
        { id: id(req) },
        (tx) => tx.eventos.reprocessar(id(req), new Date()),
      );
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
