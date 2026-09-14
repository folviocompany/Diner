<script setup>
import { ref, onMounted } from 'vue';
import { api, query } from '../lib/api.js';
import { useAppStore } from '../stores/app.js';
import { dateTime } from '../lib/format.js';
const store = useAppStore();
const usuarios = ref([]),
  eventos = ref([]),
  error = ref(''),
  modal = ref(false),
  busy = ref(false),
  page = ref(1);
const form = ref({});
const perfis = { admin: 'Administrador', gerente: 'Gerente', caixa: 'Caixa', cozinha: 'Cozinha' };
async function carregar() {
  try {
    [usuarios.value, eventos.value] = await Promise.all([
      api('/usuarios'),
      api(`/auditoria?${query({ page: page.value })}`),
    ]);
  } catch (e) {
    error.value = e.message;
  }
}
function editar(u) {
  form.value = u ? { ...u, senha: '' } : { nome: '', email: '', perfil: 'caixa', ativo: true, senha: '' };
  error.value = '';
  modal.value = true;
}
async function salvar() {
  busy.value = true;
  error.value = '';
  try {
    const { id, nome, email, perfil, ativo, senha } = form.value;
    await api(`/usuarios${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: { nome, email, perfil, ativo, ...(senha ? { senha } : {}) },
    });
    modal.value = false;
    if (id === store.usuario.id) {
      await store.carregar();
      window.location.assign('/login');
      return;
    }
    await carregar();
    store.notificar('Usuário atualizado. Sessões anteriores foram encerradas.');
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
onMounted(carregar);
</script>
<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">PESSOAS E RESPONSABILIDADES</span>
      <h1>Equipe e histórico<span class="title-dot">.</span></h1>
      <p>Gerente administra a operação; caixa atende e recebe; cozinha acompanha e prepara.</p>
    </div>
    <PButton label="Novo funcionário" icon="pi pi-plus" @click="editar()" />
  </div>
  <div v-if="error && !modal" class="alert error" role="alert">{{ error }}</div>
  <section class="panel table-scroll">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>E-mail</th>
          <th>Perfil</th>
          <th>Situação</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>{{ u.nome }}</td>
          <td>{{ u.email }}</td>
          <td>{{ perfis[u.perfil] }}</td>
          <td>{{ u.ativo ? 'Ativo' : 'Desativado' }}</td>
          <td>
            <PButton
              v-if="store.usuario.perfil === 'admin' || u.perfil !== 'admin'"
              label="Editar"
              text
              @click="editar(u)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </section>
  <section class="panel">
    <div class="panel-heading">
      <h2>Histórico de ações</h2>
      <PButton label="Atualizar histórico" text @click="carregar" />
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Quando</th>
            <th>Responsável</th>
            <th>Ação</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="evento in eventos" :key="evento.id">
            <td>{{ dateTime(evento.ocorridoEm, store.config.timezone) }}</td>
            <td>{{ evento.usuarioNome }}</td>
            <td>{{ evento.acao }}</td>
            <td>
              <details>
                <summary>Ver registro</summary>
                <pre class="audit-detail">{{ JSON.stringify(evento.dados, null, 2) }}</pre>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="pagination">
      <PButton
        label="Anterior"
        :disabled="page === 1"
        text
        @click="
          page--;
          carregar();
        "
      /><span>Página {{ page }}</span
      ><PButton
        label="Próxima"
        :disabled="eventos.length < 30"
        text
        @click="
          page++;
          carregar();
        "
      />
    </div>
  </section>
  <PDialog
    v-model:visible="modal"
    modal
    header="Dados do funcionário"
    :style="{ width: '520px', maxWidth: '95vw' }"
    ><form @submit.prevent="salvar">
      <div v-if="error" class="alert error" role="alert">{{ error }}</div>
      <label for="func-nome"
        >Nome<input id="func-nome" v-model="form.nome" required minlength="2" maxlength="120" /></label
      ><label for="func-email"
        >E-mail<input id="func-email" v-model="form.email" type="email" required maxlength="200" /></label
      ><label for="func-perfil"
        >Perfil<select id="func-perfil" v-model="form.perfil">
          <option
            v-for="(nome, perfil) in perfis"
            v-show="perfil !== 'admin' || store.usuario.perfil === 'admin'"
            :key="perfil"
            :value="perfil"
          >
            {{ nome }}
          </option>
        </select></label
      ><label for="func-senha"
        >{{ form.id ? 'Nova senha (opcional)' : 'Senha inicial'
        }}<input
          id="func-senha"
          v-model="form.senha"
          type="password"
          :required="!form.id"
          minlength="10"
          maxlength="200"
          autocomplete="new-password" /></label
      ><label class="check-row"><input v-model="form.ativo" type="checkbox" />Usuário ativo</label
      ><PButton type="submit" label="Salvar funcionário" :loading="busy" /></form
  ></PDialog>
</template>
