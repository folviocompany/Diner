import { randomUUID } from 'node:crypto';
import { exigir, NaoEncontradoError } from '../../shared/errors/DomainError.js';

export class GerenciarUsuarioUseCase {
  constructor(uow, security) {
    this.uow = uow;
    this.security = security;
  }
  executar({ id, nome, email, perfil, ativo = true, senha, atorPerfil }) {
    exigir(['admin', 'gerente', 'caixa', 'cozinha'].includes(perfil), 'Perfil inválido.');
    return this.uow.transaction(async (tx) => {
      const atual = id ? await tx.usuarios.buscarPorId(id) : null;
      if (id && !atual) throw new NaoEncontradoError('Usuário');
      exigir(
        atorPerfil === 'admin' || (perfil !== 'admin' && atual?.perfil !== 'admin'),
        'Somente administrador pode gerenciar administradores.',
      );
      if (atual?.perfil === 'admin' && atual.ativo !== false && (perfil !== 'admin' || !ativo)) {
        const outros = (await tx.usuarios.listar()).filter(
          (u) => u.id !== id && u.perfil === 'admin' && u.ativo,
        );
        exigir(outros.length > 0, 'Mantenha pelo menos um administrador ativo.');
      }
      const conflito = await tx.usuarios.buscarPorEmail(email.toLowerCase().trim());
      exigir(!conflito || conflito.id === id, 'E-mail já cadastrado.');
      if (!atual || senha)
        exigir(
          typeof senha === 'string' && senha.length >= 10 && senha.length <= 200,
          'Senha deve ter entre 10 e 200 caracteres.',
        );
      const data = {
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        perfil,
        ativo,
        ...(!atual || senha ? { senhaHash: await this.security.hashSenha(senha) } : {}),
      };
      const result = atual
        ? await tx.usuarios.atualizar(id, data)
        : await tx.usuarios.salvar({ id: randomUUID(), ...data });
      if (atual) await tx.usuarios.invalidarSessoes(id);
      const publico = { ...result };
      delete publico.senhaHash;
      return publico;
    });
  }
}
