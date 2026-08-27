// Cache de la coquille applicative. Les données (Firestore) et les photos
// (Drive) restent gérées par leurs propres mécanismes en ligne/hors-ligne.
// Monter la version à chaque déploiement pour forcer la mise à jour du cache.
const CACHE_VERSION = 'v75';
const CACHE_NAME = 'tresorerie-esperanza-' + CACHE_VERSION;

const FICHIERS_A_METTRE_EN_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon180.png',
  './icon192.png',
  './icon512.png',
  './logoheader.png'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      // Ajout fichier par fichier : un seul nom introuvable ne doit pas
      // empêcher la mise en cache du reste.
      return Promise.all(FICHIERS_A_METTRE_EN_CACHE.map(function(url){
        return cache.add(url).catch(function(e){ console.warn('SW cache raté :', url, e); });
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  const url = event.request.url;
  // Ne jamais intercepter les appels Firebase / Google Drive / Google Identity :
  // ils doivent toujours passer par le réseau (ou échouer proprement hors-ligne).
  if (url.indexOf('googleapis.com') !== -1 || url.indexOf('firebaseapp.com') !== -1 ||
      url.indexOf('firestore.googleapis.com') !== -1 || url.indexOf('accounts.google.com') !== -1 ||
      url.indexOf('gstatic.com') !== -1) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(cached){
      return cached || fetch(event.request).then(function(resp){
        if (resp && resp.ok && event.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, clone); });
        }
        return resp;
      }).catch(function(){ return cached; });
    })
  );
});
