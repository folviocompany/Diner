<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app.js';
const store = useAppStore();
const router = useRouter();
const email = ref('');
const senha = ref('');
const busy = ref(false);
const error = ref('');
async function entrar() {
  busy.value = true;
  error.value = '';
  try {
    await store.entrar({ email: email.value, senha: senha.value });
    router.push('/');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="login-page">
    <section class="login-story">
      <div class="brand">
        diner<span class="brand-dot">.</span><span class="brand-caption">GESTÃO DA LOJA</span>
      </div>
      <div class="login-headline">
        <span class="eyebrow light">DO PRIMEIRO PEDIDO AO ÚLTIMO CAFÉ</span>
        <h1>Seu negócio.<br />Bem servido.</h1>
        <p>Pedidos, caixa e resultados juntos.<br />Mais clareza para cuidar de cada detalhe.</p>
        <div class="login-illustration" aria-hidden="true">
          <div class="plate">
            <div class="plate-inner"><i aria-hidden="true" class="pi pi-shop"></i></div>
          </div>
          <span class="floating-receipt"
            ><i aria-hidden="true" class="pi pi-check-circle"></i> Tudo em ordem</span
          >
        </div>
      </div>
      <small>Um bom dia começa com uma operação organizada.</small>
    </section>
    <section class="login-form-wrap">
      <form class="login-form" @submit.prevent="entrar">
        <span class="eyebrow">BEM-VINDO AO DINER</span>
        <h2>Vamos abrir a casa?</h2>
        <p class="muted">Entre para acompanhar o movimento da sua loja.</p>
        <div v-if="error" class="alert error" role="alert">{{ error }}</div>
        <label for="email"
          >E-mail<input
            id="email"
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="voce@sualoja.com.br"
            required /></label
        ><label for="senha"
          >Senha<input
            id="senha"
            v-model="senha"
            type="password"
            autocomplete="current-password"
            placeholder="Sua senha"
            required /></label
        ><PButton
          type="submit"
          label="Entrar na loja"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :loading="busy"
          class="full-width"
        />
        <p class="login-help">Use o acesso de administrador configurado no ambiente da sua loja.</p>
      </form>
      <span class="login-copyright">diner. · Gestão que acompanha seu ritmo.</span>
    </section>
  </div>
</template>
