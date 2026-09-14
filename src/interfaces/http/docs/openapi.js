import { z } from 'zod';
import * as s from '../schemas.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const array = (items) => ({ type: 'array', items });
const str = { type: 'string' };
const int = { type: 'integer' };
const uuid = { type: 'string', format: 'uuid' };
const dateTime = { type: 'string', format: 'date-time' };
const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });
const object = (properties, required = []) => ({
  type: 'object',
  properties,
  ...(required.length ? { required } : {}),
});
const json = (schema) => ({ 'application/json': { schema } });
const convert = (schema) => {
  const result = z.toJSONSchema(schema, { io: 'input', target: 'draft-2020-12' });
  delete result.$schema;
  return result;
};
const schemas = Object.fromEntries(
  Object.entries({
    Login: s.loginSchema,
    UsuarioEntrada: s.usuarioSchema,
    EditarComanda: s.comandaSchema,
    ProdutoEntrada: s.produtoSchema,
    NovoPedido: s.pedidoSchema,
    AlterarStatus: s.statusSchema,
    PagamentoEntrada: s.pagamentoSchema,
    AbrirCaixa: s.abrirCaixaSchema,
    FecharCaixa: s.fecharCaixaSchema,
    MovimentoEntrada: s.movimentoSchema,
    DespesaEntrada: s.despesaSchema,
    EventoEntrada: s.eventoSchema,
  }).map(([name, schema]) => [name, convert(schema)]),
);
schemas.UsuarioCriacao = convert(s.usuarioSchema.required({ senha: true }));
schemas.PagamentoEntrada.properties.forma.enum = ['dinheiro', 'pix', 'credito', 'debito', 'vale'];
schemas.Login.properties.senha.writeOnly = true;
schemas.UsuarioEntrada.properties.senha.writeOnly = true;
schemas.UsuarioCriacao.properties.senha.writeOnly = true;
Object.assign(schemas, {
  Erro: object(
    {
      error: object(
        { code: str, message: str, requestId: str, details: array(object({ campo: str, mensagem: str })) },
        ['code', 'message'],
      ),
    },
    ['error'],
  ),
  Usuario: object(
    {
      id: uuid,
      nome: str,
      email: { type: 'string', format: 'email' },
      perfil: { type: 'string', enum: ['admin', 'gerente', 'caixa', 'cozinha'] },
      ativo: { type: 'boolean' },
    },
    ['id', 'nome', 'email', 'perfil', 'ativo'],
  ),
  Produto: object(
    { ...schemas.ProdutoEntrada.properties, id: uuid, criadoEm: dateTime, atualizadoEm: dateTime },
    ['id', 'nome', 'categoria', 'precoCentavos', 'custoCentavos', 'ativo'],
  ),
  Item: object({
    id: uuid,
    produtoId: uuid,
    nome: str,
    quantidade: { type: 'number' },
    observacao: nullable(str),
    precoUnitarioCentavos: int,
    custoUnitarioCentavos: int,
    subtotalCentavos: int,
  }),
  Pagamento: object({
    id: uuid,
    pedidoId: uuid,
    caixaId: nullable(uuid),
    forma: { type: 'string', enum: ['dinheiro', 'pix', 'credito', 'debito', 'vale', 'ifood_online'] },
    valorCentavos: int,
    status: { type: 'string', enum: ['confirmado', 'estornado'] },
    chaveIdempotencia: nullable(str),
    recebidoEm: dateTime,
    estornadoEm: nullable(dateTime),
  }),
  Pedido: object(
    {
      id: uuid,
      numero: int,
      origem: { type: 'string', enum: ['comanda', 'caixa', 'ifood'] },
      status: convert(s.statusSchema.shape.status),
      mesa: nullable(str),
      clienteNome: nullable(str),
      clienteContato: nullable(str),
      observacao: nullable(str),
      versao: int,
      subtotalCentavos: int,
      descontoCentavos: int,
      acrescimoCentavos: int,
      totalCentavos: int,
      receitaCentavos: int,
      custoItensCentavos: int,
      taxasCentavos: int,
      criadoEm: dateTime,
      concluidoEm: nullable(dateTime),
      canceladoEm: nullable(dateTime),
      motivoCancelamento: nullable(str),
      preservarReceita: { type: 'boolean' },
      itens: array(ref('Item')),
      pagamentos: array(ref('Pagamento')),
    },
    ['id', 'numero', 'origem', 'status', 'itens'],
  ),
  PedidoCozinha: object(
    {
      id: uuid,
      numero: int,
      origem: str,
      status: str,
      mesa: nullable(str),
      observacao: nullable(str),
      criadoEm: dateTime,
      itens: array(
        object({ id: uuid, nome: str, quantidade: { type: 'number' }, observacao: nullable(str) }),
      ),
    },
    ['id', 'numero', 'origem', 'status', 'itens'],
  ),
  Movimento: object({
    id: uuid,
    caixaId: uuid,
    tipo: { type: 'string', enum: ['sangria', 'suprimento', 'estorno'] },
    forma: nullable(str),
    valorCentavos: int,
    motivo: str,
    criadoEm: dateTime,
  }),
  Caixa: object({
    id: uuid,
    valorInicialCentavos: int,
    valorFinalCentavos: nullable(int),
    esperadoCentavos: nullable(int),
    diferencaCentavos: nullable(int),
    abertoEm: dateTime,
    fechadoEm: nullable(dateTime),
    observacao: nullable(str),
    porForma: { type: 'object', additionalProperties: int },
    movimentos: array(ref('Movimento')),
    suprimentosCentavos: int,
    sangriasCentavos: int,
  }),
  Despesa: object({ ...schemas.DespesaEntrada.properties, id: uuid, criadoEm: dateTime }),
  Reembolso: object({
    id: uuid,
    pagamentoId: uuid,
    pedidoId: uuid,
    caixaOrigemId: uuid,
    caixaDestinoId: nullable(uuid),
    forma: str,
    valorCentavos: int,
    motivo: str,
    criadoEm: dateTime,
    confirmadoEm: nullable(dateTime),
  }),
  Auditoria: object({
    id: uuid,
    usuarioId: nullable(uuid),
    usuarioNome: str,
    acao: str,
    recursoId: nullable(uuid),
    dados: { type: 'object', additionalProperties: true },
    ocorridoEm: dateTime,
  }),
  Ajuste: object({
    id: uuid,
    pedidoId: uuid,
    numero: int,
    origem: str,
    receitaCentavos: int,
    custoCentavos: int,
    motivo: str,
    ocorridoEm: dateTime,
  }),
  Evento: object({
    id: uuid,
    orderId: uuid,
    code: str,
    status: str,
    tentativas: int,
    erro: nullable(str),
    recebidoEm: dateTime,
    processadoEm: nullable(dateTime),
    proximaTentativaEm: dateTime,
  }),
  Relatorio: object({
    periodo: object({ tipo: str, inicio: dateTime, fim: dateTime, timezone: str }),
    receitaCentavos: int,
    custoItensCentavos: int,
    taxasCentavos: int,
    despesasCentavos: int,
    lucroCentavos: int,
    pedidos: int,
    ticketMedioCentavos: int,
    margemPercentual: { type: 'number' },
    aReceberCentavos: int,
    porOrigem: array(object({ origem: str, pedidos: int, receitaCentavos: int })),
    serie: array(
      object({
        data: { type: 'string', format: 'date' },
        receitaCentavos: int,
        custosCentavos: int,
        lucroCentavos: int,
        pedidos: int,
      }),
    ),
    itens: array(
      object({
        produtoId: uuid,
        nome: str,
        quantidade: { type: 'number' },
        receitaBrutaCentavos: int,
        custoCentavos: int,
      }),
    ),
    despesas: array(ref('Despesa')),
    ajustes: array(ref('Ajuste')),
  }),
});
const pedidoVisivel = {
  anyOf: [ref('Pedido'), ref('PedidoCozinha')],
  description: 'Cozinha recebe somente dados de preparo, sem valores ou dados do cliente.',
};
const parameters = {
  Id: { name: 'id', in: 'path', required: true, schema: uuid },
  Cliente: {
    name: 'X-Diner-Client',
    in: 'header',
    required: true,
    schema: { type: 'string', enum: ['web'], default: 'web' },
  },
  Idempotencia: {
    name: 'Idempotency-Key',
    in: 'header',
    required: true,
    schema: convert(s.chaveSchema),
    description:
      'Gere uma chave para cada operação. Repita a mesma chave e conteúdo após falha de conexão. Conteúdo diferente retorna 409.',
  },
};
const paramRef = (name) => ({ $ref: `#/components/parameters/${name}` });
const query = (schema) =>
  Object.entries(convert(schema).properties).map(([name, value]) => ({ name, in: 'query', schema: value }));
const paths = {};
function route(method, path, tag, summary, response, options = {}) {
  const params = [
    ...(path.includes('{id}') ? [paramRef('Id')] : []),
    ...(method !== 'get' && !options.webhook ? [paramRef('Cliente')] : []),
    ...(options.idempotente ? [paramRef('Idempotencia')] : []),
    ...(options.query ? query(options.query) : []),
  ];
  const responses = {
    [options.code ?? 200]: {
      description: options.code === 204 ? 'Sessão encerrada.' : 'Operação concluída.',
      ...(response ? { content: options.csv ? { 'text/csv': { schema: str } } : json(response) } : {}),
    },
  };
  for (const code of [400, 401, 403, 404, 409, 413, 422, 429, 500, ...(options.webhook ? [503] : [])])
    responses[code] = {
      description: {
        400: 'Dados inválidos.',
        401: 'Sessão/credencial/assinatura inválida.',
        403: 'Permissão insuficiente ou X-Diner-Client ausente.',
        404: 'Registro não encontrado.',
        409: 'Conflito de versão, idempotência ou unicidade.',
        413: 'Corpo excede o limite.',
        422: 'Regra de negócio não atendida.',
        429: 'Limite de tentativas excedido.',
        500: 'Falha interna; use X-Request-Id para diagnóstico.',
        503: 'Integração não configurada.',
      }[code],
      content: json(ref('Erro')),
    };
  paths[path] ??= {};
  paths[path][method] = {
    tags: [tag],
    summary,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    description:
      options.description ??
      (tag === 'Caixa'
        ? 'Administrador/gerente/caixa.'
        : tag === 'Pedidos'
          ? 'Todos os perfis; cozinha recebe somente dados de preparo.'
          : 'Exige sessão autenticada.'),
    parameters: params,
    responses,
    ...(options.public ? { security: [] } : {}),
    ...(options.webhook ? { security: [{ AssinaturaIfood: [] }] } : {}),
    ...(options.body
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: typeof options.body === 'string' ? ref(options.body) : options.body,
                ...(options.example ? { example: options.example } : {}),
              },
            },
          },
        }
      : {}),
  };
}
route('get', '/health', 'Sistema', 'Verificar API e banco', object({ status: str, mode: str }), {
  public: true,
});
route(
  'get',
  '/config',
  'Sistema',
  'Consultar configuração pública da loja',
  object({
    timezone: str,
    demo: { type: 'boolean' },
    ifoodConfigurado: { type: 'boolean' },
    ifoodComissaoBps: int,
  }),
);
route('post', '/auth/login', 'Autenticação', 'Entrar e receber cookie de sessão', ref('Usuario'), {
  public: true,
  body: 'Login',
  example: { email: 'seu-email@example.com', senha: 'SUA_SENHA' },
  description:
    'Use suas credenciais. O navegador guarda o cookie HttpOnly diner_session e o envia nas próximas chamadas desta origem. Em produção exige HTTPS. Limite: 30 tentativas em 15 minutos.',
});
route('post', '/auth/logout', 'Autenticação', 'Encerrar sessão', null, { public: true, code: 204 });
route('get', '/auth/me', 'Autenticação', 'Consultar usuário atual', ref('Usuario'));
route('get', '/produtos', 'Produtos', 'Listar produtos, inclusive inativos', array(ref('Produto')), {
  description: 'Administrador, gerente e caixa.',
});
route('post', '/produtos', 'Produtos', 'Cadastrar produto', ref('Produto'), {
  code: 201,
  body: 'ProdutoEntrada',
  description: 'Administrador/gerente. Preço positivo e custo não negativo, em centavos.',
  example: {
    nome: 'Lanche da casa',
    categoria: 'Lanches',
    precoCentavos: 2500,
    custoCentavos: 900,
    ativo: true,
  },
});
route('put', '/produtos/{id}', 'Produtos', 'Atualizar ou desativar produto', ref('Produto'), {
  body: 'ProdutoEntrada',
  description:
    'Administrador/gerente. Envie o cadastro completo. ativo=false desativa, sem excluir o histórico.',
});
route(
  'get',
  '/pedidos',
  'Pedidos',
  'Listar e filtrar pedidos',
  object({ data: array(pedidoVisivel), total: int, page: int, limit: int }),
  {
    query: s.listaSchema,
    description:
      'Todos os perfis. Ordenação por número decrescente. data filtra criação no fuso da loja; ativos reúne recebido/preparando/pronto. Cozinha não recebe valores.',
  },
);
route('get', '/pedidos/{id}', 'Pedidos', 'Consultar pedido', pedidoVisivel);
route('post', '/pedidos', 'Pedidos', 'Criar pedido sem duplicação', ref('Pedido'), {
  code: 201,
  body: 'NovoPedido',
  idempotente: true,
  example: {
    origem: 'comanda',
    mesa: '05',
    itens: [{ produtoId: '00000000-0000-4000-8000-000000000001', quantidade: 1 }],
  },
  description:
    'Administrador/gerente/caixa. Substitua produtoId por um produto ativo. Mesa obrigatória para comanda. Valores em centavos; quantidade com até 3 casas decimais. Descontos/acréscimos/taxas exigem gerente/admin. iFood é criado somente pela integração.',
});
route('patch', '/pedidos/{id}/status', 'Pedidos', 'Avançar preparo, concluir ou cancelar', pedidoVisivel, {
  body: 'AlterarStatus',
  example: { status: 'preparando' },
  description:
    'recebido → preparando → pronto → concluido. Cozinha só prepara; conclusão exige saldo zero. Cancelamento exige gerente/admin e motivo (3–300 caracteres). Caixa fechado é preservado e gera reembolso pendente; venda concluída gera ajuste no período atual. Status iFood é controlado pela integração.',
});
route('post', '/pedidos/{id}/pagamentos', 'Pedidos', 'Registrar pagamento líquido', ref('Pagamento'), {
  code: 201,
  body: 'PagamentoEntrada',
  idempotente: true,
  example: { forma: 'pix', valorCentavos: 2500 },
  description:
    'Administrador/gerente/caixa. Exige caixa aberto, valor positivo e até o saldo. Informe valor líquido sem troco. Cada parcela usa chave própria; ifood_online é reservado à integração.',
});
route('patch', '/comandas/{id}', 'Comandas', 'Editar consumo ou transferir mesa', ref('Pedido'), {
  body: 'EditarComanda',
  example: { versao: 0, mesa: '06', adicionar: [], remover: [] },
  description:
    'Administrador/gerente/caixa; retirada exige gerente/admin e motivo. Envie a versão consultada; conflito retorna 409. Não pode reduzir total abaixo do já pago. Novos consumos retornam a Recebido e itens anteriores mantêm preço/custo.',
});
route('get', '/caixa/atual', 'Caixa', 'Consultar caixa aberto', nullable(ref('Caixa')), {
  description: 'Administrador/gerente/caixa. Retorna null quando não há caixa aberto.',
});
route('get', '/caixas', 'Caixa', 'Listar últimas 50 sessões', array(ref('Caixa')));
route('get', '/caixas/{id}', 'Caixa', 'Consultar fechamento e saldo', ref('Caixa'));
route('post', '/caixas', 'Caixa', 'Abrir caixa', ref('Caixa'), {
  code: 201,
  body: 'AbrirCaixa',
  example: { valorInicialCentavos: 10000 },
  description: 'Administrador/gerente/caixa. Só uma sessão pode ficar aberta.',
});
route('post', '/caixas/{id}/fechar', 'Caixa', 'Fechar e conferir caixa', ref('Caixa'), {
  body: 'FecharCaixa',
  description:
    'Administrador/gerente/caixa. Informe dinheiro contado. Diferença positiva indica sobra e negativa indica falta.',
});
route('post', '/caixa/movimentos', 'Caixa', 'Registrar sangria ou suprimento', ref('Movimento'), {
  code: 201,
  body: 'MovimentoEntrada',
  description:
    'Administrador/gerente/caixa. Sangria exige saldo físico. Esta operação não lança despesa no relatório.',
});
route('get', '/reembolsos', 'Reembolsos', 'Listar devoluções pendentes', array(ref('Reembolso')), {
  description: 'Administrador/gerente.',
});
route('post', '/reembolsos/{id}/confirmar', 'Reembolsos', 'Registrar devolução realizada', ref('Reembolso'), {
  description:
    'Administrador/gerente. Exige caixa aberto, e saldo físico para dinheiro. Confirma uma única vez, na forma original. Não transfere fundos: registre somente após devolver ao cliente.',
});
route('post', '/despesas', 'Relatórios', 'Registrar despesa', ref('Despesa'), {
  code: 201,
  body: 'DespesaEntrada',
  description:
    'Administrador/gerente. ocorridoEm exige offset. Não retira dinheiro do caixa automaticamente.',
});
route('get', '/relatorios', 'Relatórios', 'Consultar resultado financeiro', ref('Relatorio'), {
  query: s.relatorioSchema,
  description:
    'Administrador/gerente. Padrão: dia atual no fuso da loja. Personalizado exige inicio/fim (inclusivo), até 366 dias. Receita e custo incluem ajustes de cancelamento no período; taxas incorridas são mantidas.',
});
route('get', '/relatorios/exportar', 'Relatórios', 'Exportar resultado diário em CSV', str, {
  csv: true,
  query: s.relatorioSchema,
  description:
    'Administrador/gerente. UTF-8 com BOM, separador ponto-e-vírgula, valores em BRL e dias sem venda incluídos.',
});
route('get', '/usuarios', 'Equipe', 'Listar funcionários', array(ref('Usuario')), {
  description: 'Administrador/gerente. Nunca retorna senha ou hash.',
});
route('post', '/usuarios', 'Equipe', 'Cadastrar funcionário', ref('Usuario'), {
  code: 201,
  body: 'UsuarioCriacao',
  description:
    'Administrador/gerente. Senha inicial obrigatória (10–200 caracteres). Só administrador gerencia perfil admin.',
});
route('put', '/usuarios/{id}', 'Equipe', 'Atualizar perfil, senha ou situação', ref('Usuario'), {
  body: 'UsuarioEntrada',
  description:
    'Administrador/gerente. Só administrador gerencia admins. Último administrador ativo é protegido. Omitir senha a mantém. Atualização revoga sessões.',
});
route('get', '/auditoria', 'Equipe', 'Consultar histórico de ações', array(ref('Auditoria')), {
  query: s.auditoriaSchema,
  description: 'Administrador/gerente. Ações e auditoria são atômicas; registros sem senha, hash ou token.',
});
route(
  'post',
  '/webhooks/ifood',
  'iFood',
  'Receber evento ou lote assinado',
  object({ recebidos: int, duplicados: int, ignorados: int }),
  {
    code: 202,
    webhook: true,
    body: { anyOf: [ref('EventoEntrada'), { ...array(ref('EventoEntrada')), maxItems: 100 }] },
    description:
      'HMAC-SHA256 hexadecimal do corpo bruto usando o secret configurado, em X-IFood-Signature. Sem sessão e sem X-Diner-Client. Lote vazio permitido. Limite de corpo: 1 MB. Não insira o secret no Swagger.',
  },
);
route('get', '/integracoes/ifood/eventos', 'iFood', 'Consultar últimos 100 eventos', array(ref('Evento')), {
  description: 'Administrador/gerente. Não inclui payload bruto nem token de processamento.',
});
route(
  'post',
  '/integracoes/ifood/eventos/{id}/reprocessar',
  'iFood',
  'Agendar nova tentativa',
  object({ reprocessamentoAgendado: { type: 'boolean' } }),
  { code: 202, description: 'Administrador/gerente. Evento indisponível retorna 409.' },
);

export const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Diner API',
    version: '1.0.0',
    description:
      'Documentação da API de gestão da loja. Dinheiro em centavos inteiros; datas em ISO 8601. Faça login em POST /auth/login usando Try it out; o cookie HttpOnly é enviado automaticamente nesta origem. Também funciona após login na aplicação. As operações respeitam o perfil do usuário e modificam os dados do ambiente acessado. Gere uma Idempotency-Key por novo pedido ou pagamento e reutilize-a somente para repetir a mesma operação.',
  },
  servers: [{ url: '/api', description: 'Mesmo ambiente da documentação' }],
  tags: [
    'Sistema',
    'Autenticação',
    'Produtos',
    'Pedidos',
    'Comandas',
    'Caixa',
    'Reembolsos',
    'Relatórios',
    'Equipe',
    'iFood',
  ].map((name) => ({ name })),
  security: [{ Sessao: [] }],
  paths,
  components: {
    schemas,
    parameters,
    securitySchemes: {
      Sessao: {
        type: 'apiKey',
        in: 'cookie',
        name: 'diner_session',
        description:
          'Obtido pelo login nesta origem. Não cole tokens: o navegador envia automaticamente o cookie HttpOnly.',
      },
      AssinaturaIfood: {
        type: 'apiKey',
        in: 'header',
        name: 'X-IFood-Signature',
        description: 'HMAC-SHA256 hexadecimal do corpo bruto. Nunca informe o secret neste campo.',
      },
    },
  },
};
