<template>
  <div class="dashboard">
    <h2>Dashboard</h2>
    <p class="subtitulo">Comissões por fornecedor</p>
    <p v-if="isLocalHost()" class="origem-dados">
      {{ isUsingCloudApi() ? 'Dados da nuvem (site na web)' : 'Dados do seu PC' }}
    </p>

    <div v-if="carregando" class="msg">Carregando...</div>
    <p v-else-if="mensagemOffline" class="msg msg-offline">{{ mensagemOffline }}</p>

    <template v-else-if="!mensagemOffline">
      <!-- Cards de resumo -->
      <div class="resumo">
        <div class="resumo-item">
          <span class="resumo-valor">{{ resumo.totalFornecedores ?? 0 }}</span>
          <span class="resumo-label">Fornecedores</span>
        </div>
        <div class="resumo-item">
          <span class="resumo-valor">{{ resumo.totalClientes ?? 0 }}</span>
          <span class="resumo-label">Clientes</span>
        </div>
        <div class="resumo-item">
          <span class="resumo-valor">{{ resumo.totalProdutos ?? 0 }}</span>
          <span class="resumo-label">Produtos</span>
        </div>
        <div class="resumo-item">
          <span class="resumo-valor">{{ resumo.totalVendas ?? 0 }}</span>
          <span class="resumo-label">Vendas (quantidade)</span>
        </div>
        <div class="resumo-item destaque">
          <span class="resumo-valor">R$ {{ formatar(resumo.totalVendido) }}</span>
          <span class="resumo-label">Total vendido (valor)</span>
        </div>
        <div class="resumo-item destaque" :class="{ 'comissao-pendente': resumo.statusAcertos === 'PENDENTE' }">
          <span class="resumo-valor">R$ {{ formatar(resumo.totalComissaoPendente) }}</span>
          <span class="resumo-label">Comissão a receber</span>
        </div>
      </div>

      <!-- Status dos acertos: pendente = outra cor (alerta); recebido = verde -->
      <div class="status-acertos" :class="{ pendente: resumo.statusAcertos === 'PENDENTE', recebido: resumo.statusAcertos !== 'PENDENTE' }">
        <span class="status-texto">
          Status: {{ resumo.statusAcertos === 'PENDENTE' ? 'Comissão pendente' : 'Comissão em dia' }}
        </span>
        <button
          type="button"
          class="btn-receber"
          :class="{ 'btn-pendente': resumo.statusAcertos === 'PENDENTE', 'btn-recebido': resumo.statusAcertos !== 'PENDENTE' }"
          :disabled="recebendo || resumo.statusAcertos !== 'PENDENTE'"
          @click="abrirConfirmacao"
        >
          {{ recebendo ? 'Salvando...' : (resumo.statusAcertos === 'PENDENTE' ? 'Marcar como recebido' : 'Marcado como recebido') }}
        </button>
        <button
          v-if="resumo.statusAcertos !== 'PENDENTE' && resumo.ultimoAcertoRecebidoId"
          type="button"
          class="btn-reabrir"
          :disabled="reabrindo"
          @click="abrirConfirmacaoReabrir"
        >
          {{ reabrindo ? 'Reabrindo...' : 'Reabrir acerto' }}
        </button>
      </div>
    </template>

    <!-- Modal de confirmação: evita marcar recebido por acidente -->
    <div v-if="mostrarConfirmacao" class="modal-backdrop" @click.self="mostrarConfirmacao = false">
      <div class="modal-confirmacao">
        <p class="modal-titulo">Confirmar recebimento</p>
        <p class="modal-texto">
          Tem certeza que deseja marcar esta comissão como recebida?<br>
          <strong>Esta ação não pode ser desfeita.</strong>
        </p>
        <div class="modal-botoes">
          <button type="button" class="modal-btn cancelar" @click="mostrarConfirmacao = false">Cancelar</button>
          <button type="button" class="modal-btn confirmar" :disabled="recebendo" @click="confirmarRecebido">Sim, marcar como recebido</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import api, { isLocalHost, isUsingCloudApi } from '../services/api';

const resumo = ref({
  totalFornecedores: 0,
  totalClientes: 0,
  totalProdutos: 0,
  totalVendas: 0,
  totalVendido: 0,
  totalComissaoPendente: 0,
  statusAcertos: 'NENHUM_PENDENTE',
  acertoPendenteId: null
});
const carregando = ref(true);
const recebendo = ref(false);
const mostrarConfirmacao = ref(false);
const mensagemOffline = ref('');

function formatar(val) {
  if (val == null) return '0,00';
  return Number(val).toFixed(2).replace('.', ',');
}

const MSG_OFFLINE_SEM_CACHE = 'Você está offline. Conecte-se para carregar os dados pela primeira vez.';

async function carregar() {
  carregando.value = true;
  mensagemOffline.value = '';
  try {
    const resResumo = await api.get('/dashboard/resumo');
    if (resResumo?.data != null) {
      const data = resResumo.data;
      resumo.value = {
        totalFornecedores: Number(data.totalFornecedores) || 0,
        totalClientes: Number(data.totalClientes) || 0,
        totalProdutos: Number(data.totalProdutos) || 0,
        totalVendas: Number(data.totalVendas) || 0,
        totalVendido: Number(data.totalVendido) || 0,
        totalComissaoPendente: Number(data.totalComissaoPendente) || 0,
        statusAcertos: data.statusAcertos === 'PENDENTE' ? 'PENDENTE' : 'NENHUM_PENDENTE',
        acertoPendenteId: data.acertoPendenteId || null,
        ultimoAcertoRecebidoId: data.ultimoAcertoRecebidoId || null
      };
    }
  } catch (e) {
    if (e.offlineNoCache || (e.message && e.message.includes('Sem conexão'))) {
      mensagemOffline.value = MSG_OFFLINE_SEM_CACHE;
    } else {
      console.error('Erro ao carregar dashboard:', e);
    }
  } finally {
    carregando.value = false;
  }
}

function abrirConfirmacao() {
  if (resumo.value.statusAcertos !== 'PENDENTE' || !resumo.value.acertoPendenteId) return;
  mostrarConfirmacao.value = true;
}

async function confirmarRecebido() {
  const id = resumo.value.acertoPendenteId;
  if (!id) return;
  mostrarConfirmacao.value = false;
  recebendo.value = true;
  try {
    const res = await api.post(`/acertos/${id}/receber`);
    if (!(res.data && res.data._offline)) await carregar();
  } catch (e) {
    console.error('Erro ao marcar recebido:', e);
  } finally {
    recebendo.value = false;
  }
}

function abrirConfirmacaoReabrir() {
  if (!resumo.value.ultimoAcertoRecebidoId) return;
  mostrarConfirmacaoReabrir.value = true;
}

async function confirmarReabrir() {
  const id = resumo.value.ultimoAcertoRecebidoId;
  if (!id) return;
  mostrarConfirmacaoReabrir.value = false;
  reabrindo.value = true;
  try {
    const res = await api.post(`/acertos/${id}/reabrir`);
    if (!(res.data && res.data._offline)) await carregar();
  } catch (e) {
    console.error('Erro ao reabrir acerto:', e);
  } finally {
    reabrindo.value = false;
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
.dashboard h2 { color: #2d5a27; margin-top: 0; }
.subtitulo { color: #666; margin-bottom: 20px; }
.origem-dados { font-size: 12px; color: #888; margin: -8px 0 16px 0; }
.resumo {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}
.resumo-item {
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  min-width: 120px;
  text-align: center;
}
.resumo-item.destaque { border-left: 4px solid #2d5a27; }
/* Card "Comissão a receber": vermelho quando pendente, verde quando recebido */
.resumo-item.destaque.comissao-pendente {
  border-left-color: #c62828;
}
.resumo-item.destaque.comissao-pendente .resumo-valor {
  color: #c62828;
}
.resumo-valor { display: block; font-size: 1.25rem; font-weight: 600; color: #2d5a27; }
.resumo-label { font-size: 12px; color: #666; }
.status-acertos {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 8px;
  font-size: 14px;
  background: #f0f0f0;
  color: #666;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
/* Pendente: amarelo/âmbar (alerta), não verde */
.status-acertos.pendente {
  background: #fff8e1;
  color: #e65100;
  border-left: 4px solid #ff8f00;
}
/* Recebido / em dia: verde */
.status-acertos.recebido {
  background: #e8f5e9;
  color: #2d5a27;
  border-left: 4px solid #2d5a27;
}
.status-acertos .status-texto { font-weight: 500; }
.status-acertos .btn-receber {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
}
/* Pendente: botão vermelho (ação "Marcar como recebido") */
.status-acertos .btn-receber.btn-pendente {
  background: #c62828;
}
.status-acertos .btn-receber.btn-pendente:hover:not(:disabled) { background: #b71c1c; }
.status-acertos .btn-receber:disabled { cursor: default; }
/* Recebido: botão verde */
.status-acertos .btn-receber.btn-recebido:disabled {
  opacity: 1;
  background: #81c784;
  color: #1b5e20;
  font-weight: 600;
}
.msg { padding: 24px; text-align: center; color: #666; }
.msg-offline { background: #fff8e1; color: #e65100; border-radius: 8px; }

/* Modal de confirmação */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-confirmacao {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}
.modal-titulo {
  margin: 0 0 12px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d5a27;
}
.modal-texto {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #444;
  line-height: 1.5;
}
.modal-texto strong { color: #c62828; }
.modal-botoes {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.modal-btn {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}
.modal-btn.cancelar {
  background: #e0e0e0;
  color: #333;
}
.modal-btn.cancelar:hover { background: #d0d0d0; }
.modal-btn.confirmar {
  background: #2d5a27;
  color: #fff;
}
.modal-btn.confirmar:hover:not(:disabled) { background: #234a1f; }
.modal-btn.confirmar:disabled { opacity: 0.7; cursor: wait; }

@media (max-width: 768px) {
  .resumo {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .resumo-item {
    min-width: 0;
    padding: 12px 14px;
  }
  .resumo-valor { font-size: 1.1rem; }
  .resumo-label { font-size: 11px; }
  .status-acertos {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .status-acertos .btn-receber { align-self: flex-start; }
}
</style>
