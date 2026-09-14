import { z } from 'zod';
import { ORIGENS, STATUS, FORMAS } from '../../domain/entities/Pedido.js';
export const idSchema = z.string().uuid();
const money = z.number().int().min(0).max(100_000_000);
const text = (max) => z.string().trim().max(max);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const loginSchema = z
  .object({ email: z.string().email().max(200), senha: z.string().min(1).max(200) })
  .strict();
export const usuarioSchema = z
  .object({
    nome: text(120).min(2),
    email: z.string().trim().email().max(200),
    perfil: z.enum(['admin', 'gerente', 'caixa', 'cozinha']),
    ativo: z.boolean().default(true),
    senha: z.string().min(10).max(200).optional(),
  })
  .strict();
export const comandaSchema = z
  .object({
    versao: z.number().int().nonnegative(),
    mesa: text(20).min(1).optional(),
    adicionar: z
      .array(
        z
          .object({
            produtoId: idSchema,
            quantidade: z.number().positive().max(1000),
            observacao: text(500).optional(),
          })
          .strict(),
      )
      .max(100)
      .default([]),
    remover: z
      .array(z.object({ itemId: idSchema, motivo: text(300).min(3) }).strict())
      .max(100)
      .default([]),
  })
  .strict();
export const auditoriaSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict();
export const produtoSchema = z
  .object({
    nome: text(120).min(2),
    categoria: text(60).min(1),
    precoCentavos: money.positive(),
    custoCentavos: money,
    codigoExterno: text(120).nullable().optional(),
    ativo: z.boolean().optional(),
  })
  .strict();
export const pedidoSchema = z
  .object({
    origem: z.enum(['comanda', 'caixa']),
    mesa: text(20).optional(),
    clienteNome: text(120).optional(),
    clienteContato: text(40).optional(),
    observacao: text(500).optional(),
    descontoCentavos: money.optional(),
    acrescimoCentavos: money.optional(),
    taxasCentavos: money.optional(),
    itens: z
      .array(
        z
          .object({
            produtoId: idSchema,
            quantidade: z.number().positive().max(1000),
            observacao: text(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const statusSchema = z.object({ status: z.enum(STATUS), motivo: text(300).optional() }).strict();
export const pagamentoSchema = z.object({ forma: z.enum(FORMAS), valorCentavos: money.positive() }).strict();
export const chaveSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const abrirCaixaSchema = z.object({ valorInicialCentavos: money }).strict();
export const fecharCaixaSchema = z
  .object({ valorFinalCentavos: money, observacao: text(300).optional() })
  .strict();
export const movimentoSchema = z
  .object({
    tipo: z.enum(['sangria', 'suprimento']),
    valorCentavos: money.positive(),
    motivo: text(300).min(3),
  })
  .strict();
export const despesaSchema = z
  .object({
    descricao: text(200).min(3),
    categoria: text(60).min(1),
    valorCentavos: money.positive(),
    ocorridoEm: z.string().datetime({ offset: true }),
  })
  .strict();
export const listaSchema = z
  .object({
    origem: z.enum(ORIGENS).optional(),
    status: z.enum([...STATUS, 'ativos']).optional(),
    busca: text(100).optional(),
    data: date.optional(),
    page: z.coerce.number().int().positive().max(100000).default(1),
    limit: z.coerce.number().int().positive().max(100).default(30),
  })
  .strict();
export const relatorioSchema = z
  .object({
    tipo: z.enum(['diario', 'semanal', 'mensal', 'personalizado']).default('diario'),
    data: date.optional(),
    inicio: date.optional(),
    fim: date.optional(),
  })
  .strict();
export const eventoSchema = z
  .object({
    id: idSchema,
    orderId: idSchema,
    merchantId: idSchema,
    code: text(80).min(1),
    fullCode: text(80).optional(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .passthrough();
