<template>
  <div class="vendas">
    <h2>Registrar Venda</h2>

    <p v-if="mensagemOffline" class="aviso aviso-offline">{{ mensagemOffline }}</p>
    <p v-else-if="produtos.length === 0 && !carregando" class="aviso">
      Cadastre produtos na aba Produtos antes de registrar vendas.
    </p>

    <div v-else class="form">
      <select v-model.number="produtoId" class="select-produto">
        <option :value="0">Selecione o produto</option>
        <option v-for="p in produtos" :key="p.id" :value="Number(p.id)">
          {{ p.nome }} — R$ {{ formatar(p.preco_venda) }} — {{ (p.Fornecedor && p.Fornecedor.nome) || 'sem fornecedor' }}
        </option>
      </select>
      <input v-model.number="quantidade" type="number" min="1" placeholder="Quantidade" />
      <select v-model.number="clienteId" class="select-cliente">
        <option :value="0">Cliente (opcional)</option>
        <option v-for="c in clientes" :key="c.id" :value="Number(c.id)">{{ c.nome || '(sem nome)' }}</option>
      </select>
      <button type="button" @click="salvarVenda" :disabled="!produtoId || produtoId === 0 || quantidade < 1 || salvando">
        <span v-if="salvando">Salvando...</span>
        <span v-else>{{ editandoId ? 'Atualizar' : 'Vender' }}</span>
      </button>
      <button v-if="editandoId" type="button" class="btn-cancelar" @click="cancelarEdicao">Cancelar</button>
    </div>

    <p v-if="mensagem" class="mensagem">{{ mensagem }}</p>

    <h3 class="titulo-lista">Histórico de vendas</h3>
    <ul v-if="vendas.length > 0" class="lista">
      <li v-for="v in vendas" :key="v.id" class="item-lista">
        <span class="item-texto">
          <strong>{{ v.Produto?.nome }}</strong> — {{ v.quantidade }} un. — R$ {{ formatar(v.valor_total) }}
          <span v-if="v.Cliente" class="cliente">({{ v.Cliente.nome || '(sem nome)' }})</span>
          <span class="data">{{ formatarData(v.data_venda) }}</span>
        </span>
        <span class="item-acoes">
          <button type="button" class="btn-editar" @click="editar(v)">Editar</button>
          <button type="button" class="btn-excluir" @click="abrirModalExcluir(v)">Excluir</button>
        </span>
      </li>
    </ul>
    <p v-else-if="!carregando" class="lista-vazia">Nenhuma venda registrada.</p>
  </div>

  <!-- Modal de confirmação centralizado -->
  <Teleport to="body">
    <div v-if="vendaAExcluir" class="modal-overlay" @click.self="fecharModalExcluir">
      <div class="modal-content">
        <h3>Confirmação</h3>
        <p>Deseja realmente excluir a venda de {{ vendaAExcluir.quantidade }} un. de {{ vendaAExcluir.Produto?.nome || 'produto' }}?</p>
        <div class="modal-buttons">
          <button type="button" class="btn-sim" @click="confirmarExcluir">Sim</button>
          <button type="button" class="btn-nao" @click="fecharModalExcluir">Não</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api from '../services/api';

const produtos = ref([]);
const clientes = ref([]);
const vendas = ref([]);
const produtoId = ref(0);
const clienteId = ref(0);
const quantidade = ref(1);
const mensagem = ref('');
const carregando = ref(true);
const editandoId = ref(null);
const vendaAExcluir = ref(null);
const salvando = ref(false);
const mensagemOffline = ref('');

function formatar(val) {
  if (val == null) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

function formatarData(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const MSG_OFFLINE_SEM_CACHE = 'Você está offline. Conecte-se para carregar os dados pela primeira vez.';

async function carregar() {
  carregando.value = true;
  mensagemOffline.value = '';
  try {
    const [resProdutos, resClientes, resVendas] = await Promise.all([
      api.get('/produtos'),
      api.get('/clientes'),
      api.get('/vendas')
    ]);
    produtos.value = resProdutos.data || [];
    clientes.value = resClientes.data || [];
    vendas.value = resVendas.data || [];
  } catch (e) {
    if (e.offlineNoCache || (e.message && e.message.includes('Sem conexão'))) {
      mensagemOffline.value = MSG_OFFLINE_SEM_CACHE;
    } else {
      console.error('Erro ao carregar:', e);
    }
    produtos.value = [];
    clientes.value = [];
    vendas.value = [];
  } finally {
    carregando.value = false;
  }
}

function editar(v) {
  editandoId.value = v.id;
  produtoId.value = Number(v.produtoId ?? v.Produto?.id) || 0;
  clienteId.value = Number(v.clienteId ?? v.Cliente?.id) || 0;
  quantidade.value = Number(v.quantidade) || 1;
  mensagem.value = '';
}

function cancelarEdicao() {
  editandoId.value = null;
  produtoId.value = 0;
  quantidade.value = 1;
  clienteId.value = 0;
  mensagem.value = '';
}

async function salvarVenda() {
  if (!produtoId.value || produtoId.value === 0 || quantidade.value < 1) return;
  mensagem.value = '';
  salvando.value = true;
  
  // Verificar se o token está presente
  const token = localStorage.getItem('token');
  if (!token) {
    mensagem.value = 'Erro: Usuário não autenticado. Faça login novamente.';
    salvando.value = false;
    return;
  }
  
  try {
    if (editandoId.value) {
      // Atualizar venda existente
      await api.put('/vendas/' + editandoId.value, {
        produtoId: produtoId.value,
        quantidade: quantidade.value,
        clienteId: clienteId.value && clienteId.value !== 0 ? clienteId.value : null
      });
      mensagem.value = 'Venda atualizada com sucesso.';
      cancelarEdicao();
      const resVendas = await api.get('/vendas');
      vendas.value = resVendas.data || [];
    } else {
      // Verificar se o produto selecionado existe
      const produtoSelecionado = produtos.value.find(p => p.id === produtoId.value);
      if (!produtoSelecionado) {
        mensagem.value = 'Produto selecionado não encontrado';
        salvando.value = false;
        return;
      }
      
      const res = await api.post('/vendas', {
        produtoId: produtoId.value,
        quantidade: quantidade.value,
        clienteId: clienteId.value && clienteId.value !== 0 ? clienteId.value : null
      });
      const savedOffline = res.data && res.data._offline;
      if (savedOffline) {
        mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
        quantidade.value = 1;
        produtoId.value = 0;
      } else {
        const v = res.data?.venda;
        mensagem.value = v ? `Venda registrada com sucesso: ${v.quantidade} un. — Total R$ ${formatar(v.valor_total)}.` : 'Venda registrada.';
        quantidade.value = 1;
        produtoId.value = 0;
      }
      if (!savedOffline) {
        const resVendas = await api.get('/vendas');
        vendas.value = resVendas.data || [];
      }
    }
  } catch (e) {
    console.error('Erro ao salvar venda:', e);
    if (e.response) {
      // Erro de resposta do servidor
      mensagem.value = e.response.data?.erro || `Erro ${e.response.status}: ${e.response.statusText}`;
    } else if (e.request) {
      // Erro de rede (servidor não respondeu)
      mensagem.value = 'Erro de rede: não foi possível conectar ao servidor. Verifique se o servidor está rodando.';
    } else {
      // Outro erro
      mensagem.value = e.message || 'Erro desconhecido ao salvar venda';
    }
  } finally {
    salvando.value = false;
  }
}

function abrirModalExcluir(v) {
  vendaAExcluir.value = v;
}

function fecharModalExcluir() {
  vendaAExcluir.value = null;
}

async function confirmarExcluir() {
  if (!vendaAExcluir.value) return;
  const id = Number(vendaAExcluir.value.id);
  fecharModalExcluir();
  try {
    const res = await api.delete('/vendas/' + id);
    if (res.data && res.data._offline) {
      mensagem.value = res.data.message || 'Salvo localmente. Será enviado quando houver conexão.';
      return;
    }
    mensagem.value = 'Venda excluída com sucesso.';
    const resVendas = await api.get('/vendas');
    vendas.value = resVendas.data || [];
  } catch (e) {
    console.error('Erro ao excluir venda:', e);
    if (e.response) {
      // Erro de resposta do servidor
      mensagem.value = e.response.data?.erro || `Erro ${e.response.status}: ${e.response.statusText}`;
    } else if (e.request) {
      // Erro de rede (servidor não respondeu)
      mensagem.value = 'Erro de rede: não foi possível conectar ao servidor. Verifique se o servidor está rodando.';
    } else {
      // Outro erro
      mensagem.value = e.message || 'Erro desconhecido ao excluir venda';
    }
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
.vendas h2 { color: #2d5a27; margin-top: 0; }
.form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}
.form select, .form input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 14px;
}
.form select.select-produto { min-width: 240px; }
.form select.select-cliente { min-width: 180px; }
.form input[type="number"] { width: 100px; }
.aviso { color: #856404; background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 16px; }
.aviso-offline { background: #fff8e1; color: #e65100; }
.form button {
  padding: 10px 20px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.form button:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-cancelar {
  background: #666 !important;
  color: #fff;
}
.titulo-lista { color: #2d5a27; font-size: 1.1rem; margin: 24px 0 12px 0; }
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
.item-texto .cliente { color: #666; font-size: 13px; }
.item-texto .data { color: #888; font-size: 12px; margin-left: 8px; }
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
.lista-vazia { color: #666; font-size: 14px; margin-top: 8px; }
.mensagem {
  padding: 12px;
  background: #e8f5e9;
  border-radius: 6px;
  color: #2d5a27;
}

/* Estilos para o modal de confirmação */
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
</style>
