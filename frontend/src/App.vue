<template>
  <div class="app">
    <template v-if="logado">
      <!-- Topo: no mobile mostra título + hamburger; no desktop mostra a nav inteira -->
      <header class="header">
        <button type="button" class="menu-toggle" aria-label="Abrir menu" @click="menuAberto = !menuAberto">
          <span class="menu-icon" :class="{ aberto: menuAberto }">
            <span></span><span></span><span></span>
          </span>
        </button>
        <span class="header-titulo">Controle Doces</span>

        <nav class="nav nav-desk">
          <button class="nav-btn" :class="{ ativo: tela === 'dashboard' }" @click="tela = 'dashboard'">Dashboard</button>
          <button class="nav-btn" :class="{ ativo: tela === 'fornecedores' }" @click="tela = 'fornecedores'">Fornecedores</button>
          <button class="nav-btn" :class="{ ativo: tela === 'clientes' }" @click="tela = 'clientes'">Clientes</button>
          <button class="nav-btn" :class="{ ativo: tela === 'produtos' }" @click="tela = 'produtos'">Produtos</button>
          <button class="nav-btn" :class="{ ativo: tela === 'vendas' }" @click="tela = 'vendas'">Vendas</button>
          <button v-if="isLocalHost()" type="button" class="nav-btn nav-btn-cloud" @click="toggleCloud">{{ isUsingCloudApi() ? 'Dados locais' : 'Dados da nuvem' }}</button>
          <button class="nav-btn sair" @click="sair">Sair</button>
        </nav>
      </header>

      <!-- Drawer no mobile -->
      <div v-if="menuAberto" class="drawer-backdrop" aria-hidden="true" @click="menuAberto = false"></div>
      <aside class="drawer" :class="{ aberto: menuAberto }">
        <nav class="drawer-nav">
          <button class="drawer-btn" :class="{ ativo: tela === 'dashboard' }" @click="ir('dashboard')">Dashboard</button>
          <button class="drawer-btn" :class="{ ativo: tela === 'fornecedores' }" @click="ir('fornecedores')">Fornecedores</button>
          <button class="drawer-btn" :class="{ ativo: tela === 'clientes' }" @click="ir('clientes')">Clientes</button>
          <button class="drawer-btn" :class="{ ativo: tela === 'produtos' }" @click="ir('produtos')">Produtos</button>
          <button class="drawer-btn" :class="{ ativo: tela === 'vendas' }" @click="ir('vendas')">Vendas</button>
          <button v-if="isLocalHost()" type="button" class="drawer-btn drawer-btn-cloud" @click="toggleCloud">{{ isUsingCloudApi() ? 'Dados locais' : 'Dados da nuvem' }}</button>
          <button class="drawer-btn sair" @click="sair">Sair</button>
        </nav>
      </aside>

      <!-- Indicador online/offline/sincronizando -->
      <div v-if="logado && statusOffline !== 'online'" class="banner-offline" :class="statusOffline">
        <span v-if="statusOffline === 'offline'">
          Você está offline. Alterações serão enviadas quando houver conexão.
          <template v-if="queueLength > 0"> ({{ queueLength }} pendente{{ queueLength !== 1 ? 's' : '' }})</template>
        </span>
        <span v-else-if="statusOffline === 'pending_choice'" class="pending-choice">
          {{ queueLength }} alteração(ões) pendente(s). Enviar para:
          <button type="button" class="btn-enviar btn-pc" @click="enviarParaPc">PC local</button>
          <button type="button" class="btn-enviar btn-nuvem" @click="enviarParaNuvem">Nuvem (web)</button>
        </span>
        <span v-else-if="statusOffline === 'syncing'">
          Sincronizando{{ queueLength > 0 ? ` ${queueLength} alteração(ões)` : '' }}...
        </span>
        <span v-else-if="statusOffline === 'synced'">Sincronizado com sucesso.</span>
      </div>

      <main class="main">
        <Dashboard v-if="tela === 'dashboard'" />
        <Fornecedores v-if="tela === 'fornecedores'" />
        <Clientes v-if="tela === 'clientes'" />
        <Produtos v-if="tela === 'produtos'" />
        <Vendas v-if="tela === 'vendas'" />
      </main>
    </template>
    <Login v-else @entrou="handleEntrou" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { initOnlineListener, getQueueLength, processQueue, processQueueToCloud, isLocalHost, isUsingCloudApi, setUseCloudApi } from './services/api';
import Dashboard from './views/Dashboard.vue';
import Fornecedores from './views/Fornecedores.vue';
import Clientes from './views/Clientes.vue';
import Produtos from './views/Produtos.vue';
import Vendas from './views/Vendas.vue';
import Login from './views/Login.vue';

const tela = ref('dashboard');
const menuAberto = ref(false);
const logado = computed(() => !!localStorage.getItem('token'));
const statusOffline = ref(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online');
const queueLength = ref(0);

async function atualizarFila() {
  const n = await getQueueLength();
  queueLength.value = n;
}

onMounted(() => {
  initOnlineListener((status) => {
    statusOffline.value = status;
    atualizarFila();
    if (status === 'synced') {
      setTimeout(() => { statusOffline.value = 'online'; }, 2500);
    }
  });
  if (statusOffline.value === 'offline') atualizarFila();
});

function ir(nome) {
  tela.value = nome;
  menuAberto.value = false;
}

function handleEntrou() {
  window.location.reload();
}

function sair() {
  localStorage.removeItem('token');
  window.location.reload();
}

function toggleCloud() {
  setUseCloudApi(!isUsingCloudApi());
}

async function enviarParaPc() {
  statusOffline.value = 'syncing';
  await processQueue();
  await atualizarFila();
  statusOffline.value = 'synced';
  setTimeout(() => { statusOffline.value = 'online'; }, 2500);
}

async function enviarParaNuvem() {
  statusOffline.value = 'syncing';
  await processQueueToCloud();
  await atualizarFila();
  statusOffline.value = 'synced';
  setTimeout(() => { statusOffline.value = 'online'; }, 2500);
}
</script>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #f5f5f5;
}
.app {
  min-height: 100vh;
}

/* Header único: no mobile título + hamburger; no desktop nav horizontal */
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #2d5a27;
  color: #fff;
}
.menu-toggle {
  display: none;
  padding: 8px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-radius: 6px;
}
.menu-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 24px;
  height: 18px;
  justify-content: space-between;
}
.menu-icon span {
  display: block;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  transition: transform 0.2s, opacity 0.2s;
}
.menu-icon.aberto span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}
.menu-icon.aberto span:nth-child(2) {
  opacity: 0;
}
.menu-icon.aberto span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}
.header-titulo {
  font-weight: 600;
  font-size: 1.1rem;
}
.nav-desk {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.nav-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: rgba(255,255,255,0.2);
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
.nav-btn:hover {
  background: rgba(255,255,255,0.3);
}
.nav-btn.sair {
  margin-left: auto;
  background: rgba(200,60,60,0.8);
}
.nav-btn.ativo {
  background: rgba(255,255,255,0.5);
  font-weight: 600;
}
.nav-btn-cloud {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.5);
  font-size: 13px;
}

/* Drawer (menu lateral) no mobile */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 98;
}
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  max-width: 85vw;
  height: 100vh;
  background: #fff;
  box-shadow: 4px 0 20px rgba(0,0,0,0.15);
  z-index: 99;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  padding: 60px 0 24px 0;
}
.drawer.aberto {
  transform: translateX(0);
}
.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}
.drawer-btn {
  display: block;
  width: 100%;
  padding: 14px 16px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  color: #333;
  font-size: 16px;
  text-align: left;
  cursor: pointer;
}
.drawer-btn:hover {
  background: #e5e5e5;
}
.drawer-btn.ativo {
  background: #e8f5e9;
  color: #2d5a27;
  font-weight: 600;
}
.drawer-btn-cloud {
  margin-top: 8px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 13px;
}
.drawer-btn.sair {
  margin-top: 12px;
  background: rgba(200,60,60,0.15);
  color: #b71c1c;
}

/* Banner online/offline/sincronizando */
.banner-offline {
  padding: 8px 16px;
  font-size: 13px;
  text-align: center;
}
.banner-offline.offline {
  background: #fff8e1;
  color: #e65100;
}
.banner-offline.syncing {
  background: #e3f2fd;
  color: #1565c0;
}
.banner-offline.synced {
  background: #e8f5e9;
  color: #2d5a27;
}
.banner-offline.pending_choice {
  background: #f3e5f5;
  color: #4a148c;
}
.pending-choice {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.btn-enviar {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}
.btn-enviar.btn-pc {
  background: #2d5a27;
  color: #fff;
}
.btn-enviar.btn-nuvem {
  background: #1565c0;
  color: #fff;
}

.main {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 60vh;
  background: #f5f5f5;
}

/* Mobile: mostrar hamburger e drawer; esconder nav desktop */
@media (max-width: 768px) {
  .menu-toggle {
    display: block;
  }
  .header-titulo {
    flex: 1;
  }
  .nav-desk {
    display: none;
  }
  .main {
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
}
</style>
