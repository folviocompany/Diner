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

export function criarContainer(uow, config = {}, gateway) {
  return {
    uow,
    config,
    criarPedido: new CriarPedidoUseCase(uow),
    atualizarStatus: new AtualizarStatusPedidoUseCase(uow),
    registrarPagamento: new RegistrarPagamentoUseCase(uow),
    salvarProduto: new SalvarProdutoUseCase(uow),
    abrirCaixa: new AbrirCaixaUseCase(uow),
    consultarCaixa: new ConsultarCaixaUseCase(uow),
    fecharCaixa: new FecharCaixaUseCase(uow),
    movimentarCaixa: new MovimentarCaixaUseCase(uow),
    registrarDespesa: new RegistrarDespesaUseCase(uow),
    relatorio: new GerarRelatorioUseCase(uow, config.timezone),
    receberWebhook: new ReceberWebhookIfoodUseCase(uow, config.ifoodMerchantId),
    processarEvento: new ProcessarEventoIfoodUseCase(
      uow,
      gateway ?? new IfoodGateway({ clientId: config.ifoodClientId, clientSecret: config.ifoodClientSecret }),
      { merchantId: config.ifoodMerchantId, comissaoBps: config.ifoodComissaoBps ?? 0 },
    ),
    autenticar: new AutenticarUseCase(uow, security, { sessionHours: config.sessionHours ?? 12 }),
  };
}
