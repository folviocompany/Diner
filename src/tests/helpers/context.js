import { randomUUID } from 'node:crypto';
import { MemoryUnitOfWork } from '../../infra/repositories/MemoryRepositories.js';
import { criarContainer } from '../../shared/container.js';
import { security } from '../../infra/security.js';

export const merchantId = '7c8e0671-d0a2-4fc2-8d45-30cb32b7e823';
export async function contexto(uow = new MemoryUnitOfWork()) {
  const config = {
    timezone: 'America/Manaus',
    ifoodMerchantId: merchantId,
    ifoodClientSecret: 'test-secret',
    ifoodComissaoBps: 1200,
    demo: false,
  };
  const c = criarContainer(uow, config);
  const produto = await c.salvarProduto.executar({
    nome: 'Lanche',
    categoria: 'Lanches',
    precoCentavos: 1990,
    custoCentavos: 700,
    codigoExterno: 'SKU-1',
  });
  return {
    c,
    uow,
    produto,
    config,
    dados: { origem: 'caixa', itens: [{ produtoId: produto.id, quantidade: 2 }] },
  };
}
export async function usuario(uow) {
  return uow.usuarios.salvar({
    id: randomUUID(),
    nome: 'Teste',
    email: 'teste@diner.local',
    senhaHash: await security.hashSenha('SenhaTeste123!'),
  });
}
export function evento(overrides = {}) {
  return {
    id: randomUUID(),
    orderId: '017437f4-dffc-4ce9-a8f8-d9873fbbf5da',
    merchantId,
    code: 'PLC',
    createdAt: '2026-09-12T15:00:00.000Z',
    ...overrides,
  };
}
export function detalhesIfood(overrides = {}) {
  return {
    id: '017437f4-dffc-4ce9-a8f8-d9873fbbf5da',
    displayId: '5678',
    merchant: { id: merchantId },
    createdAt: '2026-09-12T15:00:00.000Z',
    items: [
      { id: 'sku', externalCode: 'SKU-1', name: 'Lanche', quantity: 2, unitPrice: 19.9, totalPrice: 39.8 },
    ],
    total: { subTotal: 39.8, orderAmount: 39.8, benefits: 0, deliveryFee: 0, additionalFees: 0 },
    payments: { methods: [{ type: 'ONLINE', method: 'PIX', value: 39.8 }] },
    ...overrides,
  };
}
