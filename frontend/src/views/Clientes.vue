<template>
  <div class="clientes">
    <h2>Clientes (Compradores)</h2>

    <div class="form">
      <input v-model="nome" placeholder="Nome" />
      <input v-model="telefone" placeholder="Telefone" />
      <input v-model="email" type="email" placeholder="Email (opcional)" />
      <button type="button" class="btn-salvar" @click="salvar">{{ editandoId ? 'Atualizar' : 'Salvar' }}</button>
      <button v-if="editandoId" type="button" class="btn-cancelar" @click="cancelarEdicao">Cancelar</button>
    </div>

    <p v-if="erro" class="erro">{{ erro }}</p>
    <p v-if="sucesso" class="sucesso">{{ sucesso }}</p>

    <div v-if="clientesVazios.length > 0" class="limpar-area">
      <span>{{ clientesVazios.length }} cadastro(s) em branco.</span>
      <button type="button" class="btn-limpar" :disabled="limpando" @click="limparVazios">
        {{ limpando ? 'Removendo...' : 'Remover todos em branco' }}
      </button>
    </div>

    <ul class="lista">
      <li v-for="c in clientes" :key="c.id" class="item-lista">
        <span class="item-texto">
          <strong>{{ c.nome || '(sem nome)' }}</strong>
          <span v-if="c.telefone"> — {{ c.telefone }}</span>
          <span v-if="c.email" class="email"> — {{ c.email }}</span>
        </span>
        <span class="item-acoes">
          <button type="button" class="btn-editar" @click="editar(c)">Editar</button>
          <button type="button" class="btn-excluir" @click="excluir(c)">Excluir</button>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';

const clientes = ref([]);
const nome = ref('');
const telefone = ref('');
const email = ref('');
const editandoId = ref(null);
const erro = ref('');
const sucesso = ref('');
const limpando = ref(false);

const clientesVazios = ref([]);

const MSG_OFFLINE_SEM_CACHE = 'Você está offline. Conecte-se para carregar os dados pela primeira vez.';

async function carregar() {
  erro.value = '';
  sucesso.value = '';
  try {
    const res = await api.get('/clientes');
    const data = Array.isArray(res.data) ? res.data : [];
    clientes.value = data;
    clientesVazios.value = data.filter(c => !(c.nome && String(c.nome).trim()));
  } catch (e) {
    if (e.offlineNoCache || (e.message && e.message.includes('Sem conexão'))) {
      erro.value = MSG_OFFLINE_SEM_CACHE;
    } else {
      erro.value = e.response?.data?.erro || e.response?.data?.detalhe || e.message || 'Erro ao carregar clientes.';
    }
    clientes.value = [];
    clientesVazios.value = [];
  }
}

function editar(c) {
  const id = c && (c.id !== undefined && c.id !== null) ? Number(c.id) : null;
  if (id === null || isNaN(id)) return;
  editandoId.value = id;
  nome.value = (c.nome && String(c.nome)) || '';
  telefone.value = (c.telefone && String(c.telefone)) || '';
  email.value = (c.email && String(c.email)) || '';
  erro.value = '';
  sucesso.value = '';
}

function cancelarEdicao() {
  editandoId.value = null;
  nome.value = '';
  telefone.value = '';
  email.value = '';
}

async function salvar() {
  if (!nome.value.trim()) {
    erro.value = 'Informe o nome do cliente.';
    return;
  }
  erro.value = '';
  sucesso.value = '';
  try {
    let res;
    if (editandoId.value) {
      res = await api.put('/clientes/' + editandoId.value, {
        nome: nome.value.trim(),
        telefone: telefone.value.trim() || null,
        email: email.value.trim() || null
      });
      if (res.data && res.data._offline) {
        sucesso.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
        return;
      }
      cancelarEdicao();
    } else {
      res = await api.post('/clientes', {
        nome: nome.value.trim(),
        telefone: telefone.value.trim() || null,
        email: email.value.trim() || null
      });
      if (res.data && res.data._offline) {
        sucesso.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
        nome.value = '';
        telefone.value = '';
        email.value = '';
        return;
      }
      nome.value = '';
      telefone.value = '';
      email.value = '';
    }
    carregar();
  } catch (e) {
    erro.value = e.response?.data?.erro || e.response?.data?.detalhe || e.message || 'Erro ao salvar.';
  }
}

async function excluir(c) {
  const id = c && (c.id !== undefined && c.id !== null) ? Number(c.id) : null;
  if (id === null || isNaN(id)) return;
  const nomeExibir = (c.nome && String(c.nome).trim()) || '(sem nome)';
  
  // Criar elemento do modal de confirmação
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Confirmação</h3>
      <p>Deseja realmente excluir o cliente &quot;${nomeExibir}&quot;?</p>
      <div class="modal-buttons">
        <button class="btn-sim">Sim</button>
        <button class="btn-nao">Não</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Função para remover o modal
  const removerModal = () => {
    if (document.contains(modal)) {
      document.body.removeChild(modal);
    }
  };
  
  // Aguardar resposta do usuário
  const resposta = new Promise(resolve => {
    const btnSim = modal.querySelector('.btn-sim');
    const btnNao = modal.querySelector('.btn-nao');
    
    btnSim.addEventListener('click', () => {
      resolve(true);
      removerModal();
    });
    
    btnNao.addEventListener('click', () => {
      resolve(false);
      removerModal();
    });
  });
  
  const confirmado = await resposta;
  if (!confirmado) return;
  
  erro.value = '';
  sucesso.value = '';
  try {
    const res = await api.delete('/clientes/' + id);
    if (res.data && res.data._offline) {
      sucesso.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    sucesso.value = 'Cliente excluído.';
    carregar();
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Erro ao excluir.';
  }
}

async function limparVazios() {
  if (clientesVazios.value.length === 0) return;
  if (!confirm('Remover ' + clientesVazios.value.length + ' cadastro(s) em branco?')) return;
  erro.value = '';
  sucesso.value = '';
  limpando.value = true;
  try {
    const res = await api.delete('/clientes/limpar-vazios');
    if (res.data && res.data._offline) {
      sucesso.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    const n = (res.data && res.data.apagados) || 0;
    sucesso.value = n + ' cadastro(s) em branco removido(s).';
    carregar();
  } catch (e) {
    erro.value = e.response?.data?.erro || 'Erro ao remover.';
  } finally {
    limpando.value = false;
  }
}

function onSyncDone() {
  carregar();
}
onMounted(() => {
  carregar();
  window.addEventListener('offline-sync-done', onSyncDone);
});
onUnmounted(() => {
  window.removeEventListener('offline-sync-done', onSyncDone);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 90vw;
  width: 400px;
  text-align: center;
}

.modal-buttons {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.btn-sim, .btn-nao {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-sim {
  background: #2d5a27;
  color: white;
}

.btn-nao {
  background: #ccc;
  color: black;
}

.clientes h2 { color: #2d5a27; margin-top: 0; }
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}
.form input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
.form input[placeholder*="Nome"] { min-width: 180px; }
.form input[placeholder*="Telefone"] { width: 140px; }
.form input[placeholder*="Email"] { min-width: 180px; }
.form button {
  padding: 10px 20px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-cancelar { background: #666; }
.erro { color: #c00; font-size: 14px; margin: 0 0 12px 0; }
.sucesso { color: #2d5a27; font-size: 14px; margin: 0 0 12px 0; }
.limpar-area {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fff3cd;
  border-radius: 8px;
  flex-wrap: wrap;
}
.btn-limpar {
  padding: 8px 16px;
  background: #856404;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.btn-limpar:disabled { opacity: 0.7; cursor: not-allowed; }
.lista { list-style: none; padding: 0; margin: 0; }
.item-lista {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.item-texto { flex: 1; min-width: 140px; }
.item-texto .email { color: #666; font-size: 13px; }
.item-acoes { display: flex; gap: 8px; }
.btn-editar {
  padding: 6px 12px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
.btn-excluir {
  padding: 6px 12px;
  background: #c62828;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}
</style>
