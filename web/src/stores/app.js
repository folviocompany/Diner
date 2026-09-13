import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../lib/api.js';
export const useAppStore = defineStore('app', () => {
  const usuario = ref(null);
  const config = ref({ timezone: 'America/Manaus' });
  const inicializado = ref(false);
  const aviso = ref(null);
  let timer;
  function notificar(message, tipo = 'success') {
    aviso.value = { message, tipo };
    clearTimeout(timer);
    timer = setTimeout(() => {
      aviso.value = null;
    }, 5000);
  }
  async function carregar() {
    try {
      usuario.value = await api('/auth/me');
      config.value = await api('/config');
    } catch (error) {
      if (error.status !== 401) throw error;
      usuario.value = null;
    } finally {
      inicializado.value = true;
    }
  }
  async function entrar(dados) {
    usuario.value = await api('/auth/login', { method: 'POST', body: dados });
    config.value = await api('/config');
  }
  async function sair() {
    await api('/auth/logout', { method: 'POST' });
    usuario.value = null;
  }
  return { usuario, config, inicializado, aviso, carregar, entrar, sair, notificar };
});
