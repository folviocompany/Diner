import { randomUUID, createHash } from 'node:crypto';
import { centavos, totalizarItens } from '../../domain/entities/Pedido.js';
import { exigir, NaoEncontradoError, ConflitoError } from '../../shared/errors/DomainError.js';

const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .filter((key) => value[key] !== undefined)
            .map((key) => [key, canonical(value[key])]),
        )
      : value;

export class CriarPedidoUseCase {
  constructor(uow, clock = () => new Date()) {
    this.uow = uow;
    this.clock = clock;
  }
  async executar(dados) {
    exigir(
      ['comanda', 'caixa'].includes(dados.origem),
      'Pedidos iFood são criados exclusivamente pela integração.',
    );
    if (dados.origem === 'comanda') exigir(dados.mesa?.trim(), 'Informe a mesa da comanda.');
    return this.uow.transaction(async (tx) => {
      const { chaveIdempotencia, ...conteudo } = dados;
      const hashCriacao = createHash('sha256')
        .update(JSON.stringify(canonical(conteudo)))
        .digest('hex');
      if (chaveIdempotencia) {
        const existente = await tx.pedidos.buscarPorChave(chaveIdempotencia);
        if (existente) {
          if (existente.hashCriacao !== hashCriacao)
            throw new ConflitoError('Chave de pedido já usada com outros dados.');
          return existente;
        }
      }
      exigir(Array.isArray(dados.itens) && dados.itens.length > 0, 'Adicione itens ao pedido.');
      const itens = await Promise.all(
        dados.itens.map(async (item) => {
          const produto = await tx.produtos.buscarPorId(item.produtoId);
          if (!produto) throw new NaoEncontradoError('Produto');
          exigir(produto.ativo, `${produto.nome} está indisponível.`);
          return {
            produtoId: produto.id,
            nome: produto.nome,
            quantidade: item.quantidade,
            precoUnitarioCentavos: produto.precoCentavos,
            custoUnitarioCentavos: produto.custoCentavos,
            subtotalCentavos: Math.round(produto.precoCentavos * item.quantidade),
            observacao: item.observacao ?? null,
          };
        }),
      );
      const totais = totalizarItens(itens);
      const descontoCentavos = centavos(dados.descontoCentavos ?? 0);
      const acrescimoCentavos = centavos(dados.acrescimoCentavos ?? 0);
      exigir(descontoCentavos <= totais.subtotalCentavos, 'Desconto não pode superar o subtotal.');
      const totalCentavos = centavos(totais.subtotalCentavos - descontoCentavos + acrescimoCentavos);
      return tx.pedidos.criar({
        id: randomUUID(),
        ...(chaveIdempotencia ? { chaveIdempotencia, hashCriacao } : {}),
        origem: dados.origem,
        status: 'recebido',
        mesa: dados.origem === 'comanda' ? dados.mesa.trim() : null,
        clienteNome: dados.clienteNome || null,
        clienteContato: dados.clienteContato || null,
        observacao: dados.observacao || null,
        criadoEm: this.clock(),
        itens,
        ...totais,
        descontoCentavos,
        acrescimoCentavos,
        totalCentavos,
        receitaCentavos: totalCentavos,
        taxasCentavos: centavos(dados.taxasCentavos ?? 0),
      });
    });
  }
}
