import axios from 'axios';
import * as offline from './offline';

// No localhost: padrão = dados da nuvem (mesma informação no PC e no site). Só usa "Dados locais" se escolher.
const CLOUD_API_URL = 'https://sistema-vendas-pwa-production.up.railway.app';

function getBaseURL() {
  if (typeof window === 'undefined') return '';
  const port = window.location.port || '';
  const isLocal = window.location.hostname === 'localhost' && (port === '3333' || port === '3000' || port === '5173');
  if (isLocal && localStorage.getItem('useCloudApi') !== 'false') return '/api-cloud';
  if (port === '') return ''; // produção (Railway)
  if (port === '3333' || port === '3000') return ''; // app no backend (dados locais)
  if (port === '5173') return ''; // Vite dev: proxy envia para o backend
  const host = window.location.hostname || 'localhost';
  const protocol = window.location.protocol || 'http:';
  return `${protocol}//${host}:3333`;
}

const baseURL = getBaseURL();

/** Instância sem adapter customizado: usada para fazer a requisição real (evita erro na build). */
const apiPlain = axios.create({ baseURL });

/** Garante que cada requisição use a baseURL atual (importante ao alternar Dados da nuvem / locais). */
function ensureBaseURL(config) {
  config.baseURL = getBaseURL();
  return config;
}

const api = axios.create({
  baseURL,
  adapter: async (config) => {
    const isOffline = !offline.isOnline();

    if (isOffline && config.method?.toLowerCase() === 'get') {
      const key = offline.getCacheKeyForUrl(config.url);
      if (key) {
        const data = await offline.getCache(key);
        if (data != null) {
          return { data, status: 200, statusText: 'OK', headers: {}, config };
        }
      }
      const err = new Error('Sem conexão. Dados não disponíveis offline.');
      err.offlineNoCache = true;
      return Promise.reject(err);
    }

    if (isOffline && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      await offline.addToQueue({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params
      });
      return {
        data: { _offline: true, message: 'Salvo localmente. Será enviado quando houver conexão.' },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config
      };
    }

    const { adapter: _adapter, ...configSemAdapter } = config;
    configSemAdapter.baseURL = getBaseURL();
    return apiPlain.request(configSemAdapter);
  }
});

/** Axios só para login/cadastro/senha — sem adapter offline. */
const apiAuth = axios.create({ baseURL });

function addAuthHeader(config) {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

api.interceptors.request.use(ensureBaseURL);
api.interceptors.request.use(addAuthHeader);
apiPlain.interceptors.request.use(ensureBaseURL);
apiPlain.interceptors.request.use(addAuthHeader);
apiAuth.interceptors.request.use(ensureBaseURL);
apiAuth.interceptors.request.use(addAuthHeader);

api.interceptors.response.use(
  (response) => {
    if (offline.isOnline() && response.config?.method?.toLowerCase() === 'get') {
      const key = offline.getCacheKeyForUrl(response.config.url);
      if (key && response.data != null) {
        offline.setCache(key, response.data).catch(() => {});
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

/** Processa a fila de requisições salvas offline (chamar quando voltar online). */
export async function processQueue() {
  const list = await offline.getQueue();
  for (const item of list) {
    try {
      await api.request({
        method: item.method,
        url: item.url,
        data: item.data,
        params: item.params
      });
      await offline.removeFromQueue(item.id);
    } catch (e) {
      console.warn('Falha ao sincronizar item da fila:', item, e);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-done'));
  }
}

/** Envia a fila de pendências para a nuvem (localhost: usa proxy /api-cloud). */
export async function processQueueToCloud() {
  if (!isLocalHost()) return;
  const list = await offline.getQueue();
  const cloudApi = axios.create({
    baseURL: '/api-cloud',
    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
  });
  for (const item of list) {
    try {
      await cloudApi.request({
        method: item.method,
        url: item.url,
        data: item.data,
        params: item.params
      });
      await offline.removeFromQueue(item.id);
    } catch (e) {
      console.warn('Falha ao enviar item para a nuvem:', item, e);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-done'));
  }
}

/** Quantidade de itens na fila (para exibir "Sincronizando X itens"). */
export async function getQueueLength() {
  const list = await offline.getQueue();
  return list.length;
}

/** Estado: 'online' | 'offline' | 'syncing' | 'synced' | 'pending_choice' (local com fila: escolher PC ou nuvem) */
export function initOnlineListener(onChange) {
  if (typeof window === 'undefined') return;
  function aoFicarOnline() {
    getQueueLength().then((n) => {
      if (n === 0) {
        onChange('online');
        return;
      }
      if (isLocalHost()) {
        onChange('pending_choice');
        return;
      }
      onChange('syncing');
      processQueue().then(() => onChange('synced'));
    });
  }
  window.addEventListener('online', aoFicarOnline);
  window.addEventListener('offline', () => onChange('offline'));
  if (offline.isOnline()) {
    aoFicarOnline();
  } else {
    onChange('offline');
  }
}

export function isLocalHost() {
  if (typeof window === 'undefined') return false;
  const port = window.location.port || '';
  return window.location.hostname === 'localhost' && (port === '3333' || port === '3000' || port === '5173');
}

export function isUsingCloudApi() {
  return isLocalHost() && localStorage.getItem('useCloudApi') !== 'false';
}

export function setUseCloudApi(useCloud) {
  if (!isLocalHost()) return;
  localStorage.removeItem('token');
  if (useCloud) localStorage.removeItem('useCloudApi');
  else localStorage.setItem('useCloudApi', 'false');
  window.location.reload();
}

export { offline, apiAuth, CLOUD_API_URL };
export default api;
