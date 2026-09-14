import { DomainError } from '../../shared/errors/DomainError.js';

const gestao = [
  'produtos.gerenciar',
  'pedidos.cancelar',
  'pedidos.descontar',
  'comandas.retirar',
  'relatorios.ver',
  'despesas.criar',
  'reembolsos.confirmar',
  'integracoes.gerenciar',
  'auditoria.ver',
  'usuarios.gerenciar',
];
const caixa = [
  'pedidos.ver',
  'pedidos.criar',
  'pedidos.preparar',
  'pedidos.concluir',
  'comandas.editar',
  'pagamentos.criar',
  'caixa.operar',
  'produtos.ver',
];
export class Permissoes {
  static pode(perfil, acao) {
    if (perfil === 'admin') return true;
    if (perfil === 'gerente') return [...gestao, ...caixa].includes(acao);
    if (perfil === 'caixa') return caixa.includes(acao);
    return perfil === 'cozinha' && ['pedidos.ver', 'pedidos.preparar'].includes(acao);
  }
  static exigir(usuario, acao) {
    if (!usuario || usuario.ativo === false || !this.pode(usuario.perfil, acao))
      throw new DomainError('Seu perfil não tem permissão para esta operação.', 'SEM_PERMISSAO', 403);
  }
}
