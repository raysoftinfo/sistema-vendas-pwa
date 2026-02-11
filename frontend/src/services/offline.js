/**
 * Serviço offline: cache de leitura (GET) e fila de escritas (POST/PUT/DELETE).
 * Quando voltar online, a fila é enviada ao servidor e o cache pode ser atualizado.
 */

const DB_NAME = 'controle-doces-offline';
const DB_VERSION = 1;
const STORE_CACHE = 'cache';
const STORE_QUEUE = 'queue';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
  });
  return dbPromise;
}

export function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/** Retorna o dado em cache para a chave (ex: 'produtos', 'clientes'). */
export async function getCache(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, 'readonly');
    const req = tx.objectStore(STORE_CACHE).get(key);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
}

/** Salva resposta no cache (chave = nome do recurso). */
export async function setCache(key, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CACHE, 'readwrite');
    tx.objectStore(STORE_CACHE).put({ key, data, updatedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Adiciona requisição à fila para enviar quando online. */
export async function addToQueue(entry) {
  const db = await openDB();
  const id = entry.id || 'q-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  const full = { ...entry, id, createdAt: entry.createdAt || Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).put(full);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Retorna todos os itens da fila (ordenados por createdAt). */
export async function getQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readonly');
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => {
      const list = (req.result || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Remove um item da fila após envio com sucesso. */
export async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, 'readwrite');
    tx.objectStore(STORE_QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Mapeia URL de GET para chave de cache (apenas rotas que fazemos cache). */
export function getCacheKeyForUrl(url) {
  const path = (url || '').split('?')[0].replace(/^\//, '');
  if (path === 'produtos') return 'produtos';
  if (path === 'clientes') return 'clientes';
  if (path === 'fornecedores') return 'fornecedores';
  if (path === 'vendas') return 'vendas';
  if (path === 'dashboard/resumo') return 'dashboard/resumo';
  if (path.startsWith('acertos') && path.split('/').length <= 2) return 'acertos';
  return null;
}
