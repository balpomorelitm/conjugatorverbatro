const CACHE_NAME = 'conjugator-cache-v3';
const URLS_TO_CACHE = [
  'public/index.html',
  'src/style.css',
  'src/script.js',
  'src/level.js',
  'verbos.json',
  'assets/fonts/Schwarzenegger.woff2',
  'assets/fonts/PixelSerif_16px_v02.woff2',
  'assets/images/conjucityhk.webp',
  'assets/images/conjuchuache.webp',
  'assets/images/heart.webp',
  'assets/images/iconquestion.webp',
  'assets/images/pixel_bubble.webp',
  'assets/images/musicon.webp',
  'assets/images/musicoff.webp',
  'assets/sounds/click.mp3',
  'assets/sounds/correct.mp3',
  'assets/sounds/wrong.mp3',
  'assets/sounds/wongstudy.mp3',
  'assets/sounds/gameover.mp3',
  'assets/sounds/musicmenu.mp3',
  'assets/sounds/musicgame.mp3',
  'assets/sounds/start-verb.mp3',
  'assets/sounds/skip.mp3',
  'assets/sounds/soundbubblepop.mp3',
  'assets/sounds/soundLifeGained.mp3',
  'assets/sounds/electricshock.mp3',
  'assets/sounds/ticking.mp3',
  'assets/sounds/levelup.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .catch(err => console.error('Service worker cache failed:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Respond to recorder state requests so callers don't hang waiting for a reply
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'request-get-recorder-state') {
    const port = event.ports && event.ports[0];
    if (port) {
      port.postMessage({ supported: false });
    }
  }
});
