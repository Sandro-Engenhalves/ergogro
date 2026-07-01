/* ============================================================
   ErgoGRO — Service Worker v1

   Estratégia por tipo de recurso:
   - Firebase CDN: pré-cacheado na instalação (scripts externos estáveis)
   - HTML:         rede primeiro → cache como fallback offline
   - JS/CSS:       cache primeiro (cache busting via ?v= no HTML)
   - APIs:         sempre rede (Firestore, Auth, Anthropic)
   ============================================================ */

const CACHE_NOME = 'ergogro-sw-v1';

/* Scripts externos com URL fixa — pré-carregados na instalação */
const PRECACHE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
];

/* Domínios de API — nunca servir do cache */
const API_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'api.anthropic.com',
];

/* ── Instalação: pré-carrega CDN ─────────────────────────── */
self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(CACHE_NOME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* ── Ativação: remove caches antigos e assume controle ────── */
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NOME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Interceptação de requisições ───────────────────────────
   Ao atualizar o app (novo deploy), basta mudar CACHE_NOME
   acima — o SW antigo é substituído e o cache é limpo.        */
self.addEventListener('fetch', evento => {
  const url = new URL(evento.request.url);

  /* APIs dinâmicas: sempre rede — dados nunca ficam em cache */
  if (API_HOSTS.some(h => url.hostname.includes(h))) {
    evento.respondWith(fetch(evento.request));
    return;
  }

  /* HTML: rede primeiro para pegar atualizações; cache como fallback offline */
  const isMesmoOrigin = url.origin === self.location.origin;
  const isHTML = isMesmoOrigin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('.html'));

  if (isHTML) {
    evento.respondWith(
      fetch(evento.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NOME).then(c => c.put(evento.request, clone));
          return res;
        })
        .catch(() => caches.match(evento.request))
    );
    return;
  }

  /* JS, CSS e Firebase CDN: cache primeiro; atualiza cache em background */
  evento.respondWith(
    caches.match(evento.request).then(cached => {
      if (cached) return cached;
      return fetch(evento.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NOME).then(c => c.put(evento.request, clone));
          }
          return res;
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
    })
  );
});
