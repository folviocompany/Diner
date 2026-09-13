import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { security } from './security.js';

export const produtosIniciais = [
  {
    nome: 'Diner clássico',
    categoria: 'Hambúrgueres',
    precoCentavos: 2890,
    custoCentavos: 1120,
    codigoExterno: 'DINER-01',
  },
  {
    nome: 'Cheeseburger da casa',
    categoria: 'Hambúrgueres',
    precoCentavos: 3290,
    custoCentavos: 1360,
    codigoExterno: 'DINER-02',
  },
  {
    nome: 'Bacon & cheddar',
    categoria: 'Hambúrgueres',
    precoCentavos: 3690,
    custoCentavos: 1520,
    codigoExterno: 'DINER-03',
  },
  {
    nome: 'Veggie burger',
    categoria: 'Hambúrgueres',
    precoCentavos: 3090,
    custoCentavos: 1280,
    codigoExterno: 'DINER-04',
  },
  {
    nome: 'Batata da casa',
    categoria: 'Acompanhamentos',
    precoCentavos: 1690,
    custoCentavos: 480,
    codigoExterno: 'DINER-05',
  },
  {
    nome: 'Onion rings',
    categoria: 'Acompanhamentos',
    precoCentavos: 1890,
    custoCentavos: 620,
    codigoExterno: 'DINER-06',
  },
  {
    nome: 'Refrigerante lata',
    categoria: 'Bebidas',
    precoCentavos: 690,
    custoCentavos: 310,
    codigoExterno: 'DINER-07',
  },
  {
    nome: 'Suco natural',
    categoria: 'Bebidas',
    precoCentavos: 990,
    custoCentavos: 280,
    codigoExterno: 'DINER-08',
  },
  {
    nome: 'Milk-shake de chocolate',
    categoria: 'Sobremesas',
    precoCentavos: 1990,
    custoCentavos: 650,
    codigoExterno: 'DINER-09',
  },
  {
    nome: 'Brownie com sorvete',
    categoria: 'Sobremesas',
    precoCentavos: 2290,
    custoCentavos: 740,
    codigoExterno: 'DINER-10',
  },
];

export async function semearDemo(uow, timezone = 'America/Manaus') {
  await uow.usuarios.salvar({
    id: randomUUID(),
    nome: 'Equipe Diner',
    email: 'demo@diner.local',
    senhaHash: await security.hashSenha('DinerDemo2026!'),
  });
  const produtos = [];
  for (const p of produtosIniciais)
    produtos.push(await uow.produtos.salvar({ id: randomUUID(), ...p, ativo: true }));
  const hoje = DateTime.now().setZone(timezone).startOf('day');
  const caixa = await uow.caixas.salvar({
    id: randomUUID(),
    chaveAberto: 'principal',
    valorInicialCentavos: 20000,
    abertoEm: hoje.plus({ hours: 8 }).toJSDate(),
  });
  const nomes = [
    'Ana Lima',
    'Bruno Silva',
    'Marina Costa',
    'Lucas Alves',
    'Retirada no balcão',
    'Julia Santos',
  ];
  for (let dia = 29; dia >= 0; dia--) {
    const count = 8 + ((dia * 7 + 3) % 13);
    for (let n = 0; n < count; n++) {
      const origem = ['comanda', 'ifood', 'caixa'][n % 3];
      const produtosPedido = [produtos[(n + dia) % 4], produtos[4 + (n % 4)]];
      const itens = produtosPedido.map((p) => ({
        produtoId: p.id,
        nome: p.nome,
        quantidade: 1 + (n % 2),
        precoUnitarioCentavos: p.precoCentavos,
        custoUnitarioCentavos: p.custoCentavos,
        subtotalCentavos: p.precoCentavos * (1 + (n % 2)),
      }));
      const total = itens.reduce((s, i) => s + i.subtotalCentavos, 0);
      const criadoEm = hoje
        .minus({ days: dia })
        .plus({ hours: 10, minutes: n * 18 })
        .toJSDate();
      await uow.pedidos.criar({
        id: randomUUID(),
        origem,
        status: 'concluido',
        mesa: origem === 'comanda' ? String((n % 8) + 1).padStart(2, '0') : null,
        clienteNome: nomes[n % nomes.length],
        itens,
        criadoEm,
        concluidoEm: new Date(criadoEm.getTime() + 20 * 60000),
        subtotalCentavos: total,
        totalCentavos: total,
        receitaCentavos: total,
        custoItensCentavos: itens.reduce((s, i) => s + i.custoUnitarioCentavos * i.quantidade, 0),
        descontoCentavos: 0,
        acrescimoCentavos: 0,
        taxasCentavos: origem === 'ifood' ? Math.round(total * 0.12) : 0,
        pagamentos: [
          {
            valorCentavos: total,
            forma: origem === 'ifood' ? 'ifood_online' : ['pix', 'dinheiro', 'credito'][n % 3],
            status: 'confirmado',
            recebidoEm: criadoEm,
            ...(dia === 0 && origem !== 'ifood' ? { caixaId: caixa.id } : {}),
          },
        ],
      });
    }
  }
  for (let i = 0; i < 6; i++) {
    const p = produtos[i % 4];
    const origem = ['comanda', 'ifood', 'caixa'][i % 3];
    await uow.pedidos.criar({
      id: randomUUID(),
      origem,
      status: ['recebido', 'preparando', 'pronto'][i % 3],
      mesa: origem === 'comanda' ? String(i + 1).padStart(2, '0') : null,
      clienteNome: nomes[i],
      criadoEm: new Date(Date.now() - (6 - i) * 60000),
      itens: [
        {
          produtoId: p.id,
          nome: p.nome,
          quantidade: 2,
          precoUnitarioCentavos: p.precoCentavos,
          custoUnitarioCentavos: p.custoCentavos,
          subtotalCentavos: p.precoCentavos * 2,
        },
      ],
      subtotalCentavos: p.precoCentavos * 2,
      totalCentavos: p.precoCentavos * 2,
      receitaCentavos: p.precoCentavos * 2,
      custoItensCentavos: p.custoCentavos * 2,
      descontoCentavos: 0,
      acrescimoCentavos: 0,
      taxasCentavos: 0,
      observacao: i === 0 ? 'Um dos lanches sem cebola.' : null,
      pagamentos:
        origem === 'ifood'
          ? [{ forma: 'ifood_online', valorCentavos: p.precoCentavos * 2, status: 'confirmado' }]
          : [],
    });
  }
  await uow.financeiro.criarDespesa({
    id: randomUUID(),
    descricao: 'Embalagens para delivery',
    categoria: 'Operacional',
    valorCentavos: 4200,
    ocorridoEm: hoje.plus({ hours: 9 }).toJSDate(),
    criadoEm: new Date(),
  });
}
