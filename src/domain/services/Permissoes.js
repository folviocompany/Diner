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
const porPerfil = {
  gerente: new Set([...gestao, ...caixa]),
  caixa: new Set(caixa),
  cozinha: new Set(['pedidos.ver', 'pedidos.preparar']),
};
export class Permissoes {
  static pode(perfil, acao) {
    if (perfil === 'admin') return true;
    return porPerfil[perfil]?.has(acao) ?? false;
  }
  static exigir(usuario, acao) {
    if (!usuario || usuario.ativo === false || !this.pode(usuario.perfil, acao))
      throw new DomainError('Seu perfil não tem permissão para esta operação.', 'SEM_PERMISSAO', 403);
  }
}
