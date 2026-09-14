import { ZodError } from 'zod';
import { DomainError } from '../../../shared/errors/DomainError.js';

export function tratarErro(error, req, res, _next) {
  if (error instanceof ZodError)
    return res.status(400).json({
      error: {
        code: 'DADOS_INVALIDOS',
        message: 'Revise os dados informados.',
        details: error.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
    });
  if (error instanceof DomainError)
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  if (error.type === 'entity.too.large')
    return res
      .status(413)
      .json({ error: { code: 'PAYLOAD_GRANDE', message: 'A requisição excede o limite de tamanho.' } });
  if (error instanceof SyntaxError && error.status === 400)
    return res.status(400).json({ error: { code: 'JSON_INVALIDO', message: 'JSON inválido.' } });
  if (['P2002', 'P2034'].includes(error.code))
    return res
      .status(409)
      .json({ error: { code: 'CONFLITO', message: 'Conflito de atualização. Atualize e tente novamente.' } });
  if (error.code === 'P2025')
    return res.status(404).json({ error: { code: 'NAO_ENCONTRADO', message: 'Registro não encontrado.' } });
  console.error(
    JSON.stringify({ level: 'error', requestId: req.id, code: error.code ?? 'INTERNO', name: error.name }),
  );
  return res.status(500).json({
    error: { code: 'ERRO_INTERNO', message: 'Não foi possível concluir a operação.', requestId: req.id },
  });
}
