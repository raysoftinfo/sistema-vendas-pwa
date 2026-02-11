<template>
  <div class="fornecedores">
    <h2>Fornecedores</h2>

    <div class="form">
      <input v-model="nome" placeholder="Nome do fornecedor" class="input-nome" />
      <input v-model="telefone" placeholder="Telefone (contato)" class="input-tel" />
      <input v-model="contato" placeholder="Nome da pessoa de contato" class="input-contato" />
      <input v-model.number="percentual" type="number" placeholder="Comissão %" min="0" max="100" step="0.5" class="input-percentual" />
      <button type="button" class="btn-salvar" @click="salvar">{{ editandoId ? 'Atualizar' : 'Salvar' }}</button>
      <button v-if="editandoId" type="button" class="btn-cancelar" @click="cancelarEdicao">Cancelar</button>
    </div>
    <p class="form-dica">Preencha o telefone para poder entrar em contato com o fornecedor.</p>
    <p v-if="mensagem" class="mensagem-fornecedor">{{ mensagem }}</p>

    <ul class="lista">
      <li v-for="f in fornecedores" :key="f.id" class="item-lista">
        <span class="item-texto">
          <strong>{{ f.nome }}</strong>
          <span v-if="f.telefone"> — {{ f.telefone }}</span>
          <span v-if="f.contato"> — {{ f.contato }}</span>
          <div class="info-adicional">{{ f.percentual_comissao }}% comissão</div>
        </span>
        <span class="item-acoes">
          <button class="btn-editar" @click="editar(f)">Editar</button>
          <button class="btn-excluir" @click="excluir(f)">Excluir</button>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';

const fornecedores = ref([]);
const nome = ref('');
const telefone = ref('');
const contato = ref('');
const percentual = ref(30);
const editandoId = ref(null);
const mensagem = ref('');

const MSG_OFFLINE_SEM_CACHE = 'Você está offline. Conecte-se para carregar os dados pela primeira vez.';

async function carregar() {
  mensagem.value = '';
  try {
    const res = await api.get('/fornecedores');
    fornecedores.value = res.data || [];
  } catch (e) {
    if (e.offlineNoCache || (e.message && e.message.includes('Sem conexão'))) {
      mensagem.value = MSG_OFFLINE_SEM_CACHE;
    } else {
      console.error('Erro ao carregar:', e);
    }
    fornecedores.value = [];
  }
}

function editar(f) {
  editandoId.value = f.id;
  nome.value = f.nome;
  telefone.value = f.telefone || '';
  contato.value = f.contato || '';
  percentual.value = f.percentual_comissao ?? 30;
}

function cancelarEdicao() {
  editandoId.value = null;
  nome.value = '';
  telefone.value = '';
  contato.value = '';
  percentual.value = 30;
}

async function salvar() {
  if (!nome.value.trim()) return;
  mensagem.value = '';
  let res;
  if (editandoId.value) {
    res = await api.put('/fornecedores/' + editandoId.value, {
      nome: nome.value.trim(),
      telefone: telefone.value.trim() || null,
      contato: contato.value.trim() || null,
      percentual_comissao: percentual.value
    });
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    cancelarEdicao();
  } else {
    res = await api.post('/fornecedores', {
      nome: nome.value.trim(),
      telefone: telefone.value.trim() || null,
      contato: contato.value.trim() || null,
      percentual_comissao: percentual.value
    });
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      nome.value = '';
      telefone.value = '';
      contato.value = '';
      percentual.value = 30;
      return;
    }
    nome.value = '';
    telefone.value = '';
    contato.value = '';
    percentual.value = 30;
  }
  carregar();
}

async function excluir(f) {
  // Criar elemento do modal de confirmação
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Confirmação</h3>
      <p>Deseja realmente excluir o fornecedor &quot;${f.nome}&quot;?</p>
      <p class="aviso">Produtos vinculados podem ficar sem fornecedor.</p>
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
  
  mensagem.value = '';
  try {
    const res = await api.delete('/fornecedores/' + f.id);
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    carregar();
  } catch (e) {
    mensagem.value = e.response?.data?.erro || 'Erro ao excluir.';
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
.mensagem-fornecedor {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  background: #fff8e1;
  color: #e65100;
}
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

.aviso {
  color: #666;
  font-size: 14px;
  margin: 10px 0 0 0;
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

.fornecedores h2 { color: #2d5a27; margin-top: 0; }
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
  align-items: center;
}
.form input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
.form .input-nome { min-width: 180px; }
.form .input-tel { min-width: 140px; }
.form .input-contato { min-width: 160px; }
.form .input-percentual { width: 100px; }
.form-dica {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #666;
}
.form button {
  padding: 10px 20px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
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
.info-adicional { color: #666; font-size: 13px; margin-top: 4px; }
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
.btn-cancelar {
  padding: 10px 20px;
  background: #666;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
