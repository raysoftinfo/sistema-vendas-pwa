<template>
  <div class="produtos">
    <h2>Produtos</h2>

    <div class="form">
      <input v-model="nome" placeholder="Nome do produto" />
      <input v-model.number="preco" type="number" step="0.01" min="0" placeholder="Preço R$" />
      <select v-model.number="fornecedorId" class="select-fornecedor">
        <option :value="0">Selecione o fornecedor</option>
        <option v-for="f in fornecedores" :key="f.id" :value="Number(f.id)">{{ f.nome || '(sem nome)' }}</option>
      </select>
      <button type="button" @click="salvar">{{ editandoId ? 'Atualizar' : 'Salvar' }}</button>
      <button v-if="editandoId" type="button" @click="cancelarEdicao">Cancelar</button>
    </div>

    <p v-if="fornecedores.length === 0" class="aviso">Cadastre um fornecedor na aba Fornecedores antes de cadastrar produtos.</p>
    <p v-if="mensagem" :class="mensagemErro ? 'aviso-erro' : 'aviso-ok'">{{ mensagem }}</p>

    <ul class="lista">
      <li v-for="p in produtos" :key="p.id" class="item-lista">
        <span class="item-texto">
          <strong>{{ p.nome }}</strong> — R$ {{ formatar(p.preco_venda) }}
          <span class="forn">({{ (p.Fornecedor && p.Fornecedor.nome) || 'sem fornecedor' }})</span>
        </span>
        <span class="item-acoes">
          <button type="button" class="btn-editar" @click="editar(p)">Editar</button>
          <button type="button" class="btn-excluir" @click="abrirModalExcluir(p)">Excluir</button>
        </span>
      </li>
    </ul>

    <!-- Modal de confirmação centralizado -->
    <Teleport to="body">
      <div v-if="produtoAExcluir" class="modal-overlay" @click.self="fecharModalExcluir">
        <div class="modal-content">
          <h3>Confirmação</h3>
          <p>Deseja realmente excluir o produto &quot;{{ produtoAExcluir.nome }}&quot;?</p>
          <div class="modal-buttons">
            <button type="button" class="btn-sim" @click="confirmarExcluir">Sim</button>
            <button type="button" class="btn-nao" @click="fecharModalExcluir">Não</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';

const produtos = ref([]);
const fornecedores = ref([]);
const nome = ref('');
const preco = ref('');
const fornecedorId = ref(0);
const editandoId = ref(null);
const produtoAExcluir = ref(null);
const mensagem = ref('');
const mensagemErro = ref(false);

function formatar(val) {
  if (val == null) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

function editar(p) {
  editandoId.value = p.id;
  nome.value = p.nome;
  preco.value = p.preco_venda;
  fornecedorId.value = Number(p.fornecedorId) || 0;
}

function cancelarEdicao() {
  editandoId.value = null;
  nome.value = '';
  preco.value = '';
  fornecedorId.value = 0;
}

const MSG_OFFLINE_SEM_CACHE = 'Você está offline. Conecte-se para carregar os dados pela primeira vez.';

async function carregar() {
  mensagem.value = '';
  try {
    const [resProdutos, resFornecedores] = await Promise.all([
      api.get('/produtos'),
      api.get('/fornecedores')
    ]);
    produtos.value = resProdutos.data || [];
    fornecedores.value = resFornecedores.data || [];
  } catch (e) {
    if (e.offlineNoCache || (e.message && e.message.includes('Sem conexão'))) {
      mensagem.value = MSG_OFFLINE_SEM_CACHE;
      mensagemErro.value = false;
    } else {
      console.error('Erro ao carregar:', e);
    }
    fornecedores.value = [];
    produtos.value = [];
  }
}

async function salvar() {
  if (!nome.value.trim() || preco.value === '' || !fornecedorId.value || fornecedorId.value === 0) return;
  mensagem.value = '';
  mensagemErro.value = false;
  let res;
  if (editandoId.value) {
    res = await api.put('/produtos/' + editandoId.value, {
      nome: nome.value.trim(),
      preco_venda: Number(preco.value),
      fornecedorId: fornecedorId.value
    });
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    cancelarEdicao();
  } else {
    res = await api.post('/produtos', {
      nome: nome.value.trim(),
      preco_venda: Number(preco.value),
      fornecedorId: fornecedorId.value
    });
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      nome.value = '';
      preco.value = '';
      fornecedorId.value = 0;
      return;
    }
    nome.value = '';
    preco.value = '';
    fornecedorId.value = 0;
  }
  carregar();
}

function abrirModalExcluir(p) {
  produtoAExcluir.value = p;
}

function fecharModalExcluir() {
  produtoAExcluir.value = null;
}

async function confirmarExcluir() {
  if (!produtoAExcluir.value) return;
  const id = Number(produtoAExcluir.value.id);
  fecharModalExcluir();
  mensagem.value = '';
  mensagemErro.value = false;
  try {
    const res = await api.delete('/produtos/' + id);
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    mensagem.value = 'Produto excluído.';
    mensagemErro.value = false;
    carregar();
  } catch (e) {
    mensagem.value = e.response?.data?.erro || e.message || 'Erro ao excluir produto.';
    mensagemErro.value = true;
    console.error('Erro ao excluir:', e);
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
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
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

.produtos h2 { color: #2d5a27; margin-top: 0; }
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}
.form input, .form select {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
.form select.select-fornecedor { min-width: 200px; }
.aviso { color: #856404; background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
.aviso-ok { color: #2d5a27; background: #e8f5e9; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
.aviso-erro { color: #b71c1c; background: #ffebee; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
.form button {
  padding: 10px 20px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.lista { list-style: none; padding: 0; margin: 0; }
.lista li {
  padding: 12px 16px;
  background: #fff;
  margin-bottom: 8px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
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

.lista .forn { color: #666; font-size: 13px; }
</style>
