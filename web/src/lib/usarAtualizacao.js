import { onMounted, onUnmounted } from 'vue';
import { AtualizacaoAutomatica } from './AtualizacaoAutomatica.js';
export function usarAtualizacao(carregar, permitido = () => true) {
  const atualizador = new AtualizacaoAutomatica(carregar, {
    permitido: () => !document.hidden && permitido(),
  });
  onMounted(() => atualizador.iniciar());
  onUnmounted(() => atualizador.parar());
}
