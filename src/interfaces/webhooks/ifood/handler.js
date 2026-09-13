import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { eventoSchema } from '../../http/schemas.js';
import { DomainError } from '../../../shared/errors/DomainError.js';

export function validarAssinatura(raw, signature, secret) {
  if (
    !secret ||
    !Buffer.isBuffer(raw) ||
    typeof signature !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(signature)
  )
    return false;
  const esperado = createHmac('sha256', secret).update(raw).digest();
  return timingSafeEqual(esperado, Buffer.from(signature, 'hex'));
}
export function webhookHandler(container) {
  return async (req, res) => {
    if (!container.config.ifoodClientSecret || !container.config.ifoodMerchantId)
      throw new DomainError('Integração iFood não configurada.', 'IFOOD_NAO_CONFIGURADO', 503);
    if (!validarAssinatura(req.body, req.headers['x-ifood-signature'], container.config.ifoodClientSecret))
      throw new DomainError('Assinatura iFood inválida.', 'ASSINATURA_INVALIDA', 401);
    let payload;
    try {
      payload = JSON.parse(req.body.toString('utf8'));
    } catch {
      throw new DomainError('JSON inválido.', 'JSON_INVALIDO', 400);
    }
    // Também permite lote vazio usado como heartbeat; corpo é validado e autenticado.
    const eventos = z
      .array(eventoSchema)
      .max(100)
      .parse(Array.isArray(payload) ? payload : [payload]);
    const resultado = await container.receberWebhook.executar(eventos);
    res.status(202).json(resultado);
  };
}
