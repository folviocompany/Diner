export class DomainError extends Error {
  constructor(message, code = 'REGRA_NEGOCIO', status = 422, details) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export class NaoEncontradoError extends DomainError {
  constructor(entidade = 'Registro') {
    super(`${entidade} não encontrado.`, 'NAO_ENCONTRADO', 404);
  }
}
export class ConflitoError extends DomainError {
  constructor(message = 'O registro foi alterado. Atualize e tente novamente.') {
    super(message, 'CONFLITO', 409);
  }
}
export function exigir(condition, message, code) {
  if (!condition) throw new DomainError(message, code);
}
