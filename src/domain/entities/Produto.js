import { centavos } from './Pedido.js';
import { exigir } from '../../shared/errors/DomainError.js';

export function validarProduto(dados) {
  exigir(
    typeof dados.nome === 'string' && dados.nome.trim().length >= 2 && dados.nome.length <= 120,
    'Nome do produto deve ter de 2 a 120 caracteres.',
  );
  exigir(
    typeof dados.categoria === 'string' && dados.categoria.trim().length > 0 && dados.categoria.length <= 60,
    'Informe a categoria.',
  );
  centavos(dados.precoCentavos, 'Preço');
  centavos(dados.custoCentavos, 'Custo');
  exigir(dados.precoCentavos > 0, 'Preço deve ser maior que zero.');
  return {
    nome: dados.nome.trim(),
    categoria: dados.categoria.trim(),
    precoCentavos: dados.precoCentavos,
    custoCentavos: dados.custoCentavos,
    codigoExterno: dados.codigoExterno?.trim() || null,
    ativo: dados.ativo ?? true,
  };
}
