import { CriarPedidoUseCase } from '../application/use-cases/CriarPedidoUseCase.js';
import { AtualizarStatusPedidoUseCase } from '../application/use-cases/AtualizarStatusPedidoUseCase.js';
import { RegistrarPagamentoUseCase } from '../application/use-cases/RegistrarPagamentoUseCase.js';
import { SalvarProdutoUseCase } from '../application/use-cases/SalvarProdutoUseCase.js';
import { AbrirCaixaUseCase } from '../application/use-cases/AbrirCaixaUseCase.js';
import { ConsultarCaixaUseCase } from '../application/use-cases/ConsultarCaixaUseCase.js';
import { FecharCaixaUseCase } from '../application/use-cases/FecharCaixaUseCase.js';
import { MovimentarCaixaUseCase } from '../application/use-cases/MovimentarCaixaUseCase.js';
import { RegistrarDespesaUseCase } from '../application/use-cases/RegistrarDespesaUseCase.js';
import { GerarRelatorioUseCase } from '../application/use-cases/GerarRelatorioUseCase.js';
import { ReceberWebhookIfoodUseCase } from '../application/use-cases/ReceberWebhookIfoodUseCase.js';
import { ProcessarEventoIfoodUseCase } from '../application/use-cases/ProcessarEventoIfoodUseCase.js';
import { AutenticarUseCase } from '../application/use-cases/AutenticarUseCase.js';
import { IfoodGateway } from '../infra/ifood/IfoodGateway.js';
import { security } from '../infra/security.js';
import { EditarComandaUseCase } from '../application/use-cases/EditarComandaUseCase.js';
import { ConfirmarReembolsoUseCase } from '../application/use-cases/ConfirmarReembolsoUseCase.js';
import { GerenciarUsuarioUseCase } from '../application/use-cases/GerenciarUsuarioUseCase.js';
import { AcaoAuditadaUseCase } from '../application/use-cases/AcaoAuditadaUseCase.js';

const factories = {
  editarComanda: ({ uow }) => new EditarComandaUseCase(uow),
  confirmarReembolso: ({ uow }) => new ConfirmarReembolsoUseCase(uow),
  gerenciarUsuario: ({ uow }) => new GerenciarUsuarioUseCase(uow, security),
  acaoAuditada: ({ uow }) => new AcaoAuditadaUseCase(uow),
  criarPedido: ({ uow }) => new CriarPedidoUseCase(uow),
  atualizarStatus: ({ uow }) => new AtualizarStatusPedidoUseCase(uow),
  registrarPagamento: ({ uow }) => new RegistrarPagamentoUseCase(uow),
  salvarProduto: ({ uow }) => new SalvarProdutoUseCase(uow),
  abrirCaixa: ({ uow }) => new AbrirCaixaUseCase(uow),
  consultarCaixa: ({ uow }) => new ConsultarCaixaUseCase(uow),
  fecharCaixa: ({ uow }) => new FecharCaixaUseCase(uow),
  movimentarCaixa: ({ uow }) => new MovimentarCaixaUseCase(uow),
  registrarDespesa: ({ uow }) => new RegistrarDespesaUseCase(uow),
  relatorio: ({ uow, config }) => new GerarRelatorioUseCase(uow, config.timezone),
  receberWebhook: ({ uow, config }) => new ReceberWebhookIfoodUseCase(uow, config.ifoodMerchantId),
  processarEvento: ({ uow, config, gateway }) =>
    new ProcessarEventoIfoodUseCase(
      uow,
      gateway ?? new IfoodGateway({ clientId: config.ifoodClientId, clientSecret: config.ifoodClientSecret }),
      { merchantId: config.ifoodMerchantId, comissaoBps: config.ifoodComissaoBps ?? 0 },
    ),
  autenticar: ({ uow, config }) =>
    new AutenticarUseCase(uow, security, { sessionHours: config.sessionHours ?? 12 }),
};

export function criarCasoDeUso(nome, uow, config = {}, gateway) {
  return factories[nome]({ uow, config, gateway });
}

export function criarContainer(uow, config = {}, gateway) {
  const casos = Object.fromEntries(
    Object.keys(factories).map((nome) => [nome, criarCasoDeUso(nome, uow, config, gateway)]),
  );
  return { uow, config, ...casos };
}
