// Contratos em JavaScript: adaptadores reais e de teste herdam as mesmas classes.
const abstrato = () => {
  throw new Error('Método do contrato não implementado.');
};
export class PedidoRepository {
  buscarPorChave() {
    return abstrato();
  }
  editarComanda() {
    return abstrato();
  }
  criar() {
    return abstrato();
  }
  buscarPorId() {
    return abstrato();
  }
  buscarReferenciasPorIds() {
    return abstrato();
  }
  buscarPorExterno() {
    return abstrato();
  }
  listar() {
    return abstrato();
  }
  buscarPorPeriodo() {
    return abstrato();
  }
  atualizar() {
    return abstrato();
  }
}
export class ProdutoRepository {
  listar() {
    return abstrato();
  }
  buscarPorId() {
    return abstrato();
  }
  salvar() {
    return abstrato();
  }
}
export class CaixaRepository {
  atual() {
    return abstrato();
  }
  buscarPorId() {
    return abstrato();
  }
  listar() {
    return abstrato();
  }
  salvar() {
    return abstrato();
  }
  pagamentos() {
    return abstrato();
  }
  movimentos() {
    return abstrato();
  }
  movimentar() {
    return abstrato();
  }
}
export class FinanceiroRepository {
  estornarPagamento() {
    return abstrato();
  }
  criarReembolso() {
    return abstrato();
  }
  buscarReembolso() {
    return abstrato();
  }
  reembolsosPendentes() {
    return abstrato();
  }
  confirmarReembolso() {
    return abstrato();
  }
  criarAjuste() {
    return abstrato();
  }
  ajustes() {
    return abstrato();
  }
  pagar() {
    return abstrato();
  }
  buscarPagamento() {
    return abstrato();
  }
  despesas() {
    return abstrato();
  }
  criarDespesa() {
    return abstrato();
  }
}
export class EventoRepository {
  registrar() {
    return abstrato();
  }
  reivindicar() {
    return abstrato();
  }
  finalizar() {
    return abstrato();
  }
  listar() {
    return abstrato();
  }
  reprocessar() {
    return abstrato();
  }
}
export class UsuarioRepository {
  listar() {
    return abstrato();
  }
  buscarPorId() {
    return abstrato();
  }
  atualizar() {
    return abstrato();
  }
  invalidarSessoes() {
    return abstrato();
  }
  buscarPorEmail() {
    return abstrato();
  }
  salvar() {
    return abstrato();
  }
  criarSessao() {
    return abstrato();
  }
  buscarSessao() {
    return abstrato();
  }
  excluirSessao() {
    return abstrato();
  }
}
export class UnitOfWork {
  transaction() {
    return abstrato();
  }
}
export class AuditoriaRepository {
  registrar() {
    return abstrato();
  }
  listar() {
    return abstrato();
  }
}
