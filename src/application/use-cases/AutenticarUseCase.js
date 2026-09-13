import { DomainError, exigir } from '../../shared/errors/DomainError.js';

export class AutenticarUseCase {
  constructor(uow, security, { sessionHours = 12, clock = () => new Date() } = {}) {
    this.uow = uow;
    this.security = security;
    this.sessionHours = sessionHours;
    this.clock = clock;
  }
  async executar({ email, senha }) {
    const usuario = await this.uow.usuarios.buscarPorEmail(email.toLowerCase().trim());
    const ok = await this.security.verificarSenha(senha, usuario?.senhaHash);
    if (!usuario || !ok) throw new DomainError('E-mail ou senha incorretos.', 'NAO_AUTORIZADO', 401);
    const token = this.security.novoToken();
    const expiraEm = new Date(this.clock().getTime() + this.sessionHours * 3600000);
    await this.uow.transaction((tx) =>
      tx.usuarios.criarSessao({ tokenHash: this.security.hashToken(token), usuarioId: usuario.id, expiraEm }),
    );
    return { token, expiraEm, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } };
  }
  async sessao(token) {
    exigir(typeof token === 'string', 'Sessão inválida.');
    const s = await this.uow.usuarios.buscarSessao(this.security.hashToken(token));
    if (!s || s.expiraEm <= this.clock())
      throw new DomainError('Entre novamente para continuar.', 'NAO_AUTORIZADO', 401);
    return { id: s.usuario.id, nome: s.usuario.nome, email: s.usuario.email };
  }
  sair(token) {
    return this.uow.transaction((tx) => tx.usuarios.excluirSessao(this.security.hashToken(token)));
  }
}
