// 离线缓存
const CACHE_NAME = 'nanno-schedule-v1';

// 需要缓存在手机本地的核心文件
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/js/app.js',
  '/js/store.js',
  '/js/utils.js',
  '/js/components/ScheduleView.js',
  '/js/components/GradesView.js',
  '/js/components/ProfileView.js',
  '/js/components/LibraryView.js',
  '/js/components/LevelExamsView.js',
  '/js/components/ExamsView.js',
  '/js/lib/vue.global.min.js',
  '/js/lib/marked.min.js',
  '/img/logo.png',
  '/manifest.json',
  '/md/contact.md'
];

// 1. 安装时：把核心文件全部下载到手机的隐秘空间
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('正在缓存核心骨架...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 拦截网络请求：断网时的救命稻草
self.addEventListener('fetch', event => {
  // 只拦截前端静态资源，绝不拦截后端的 API 请求 (/api/xxx)
  if (event.request.url.includes('/api/')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存里有（比如断网了），直接秒回缓存的 HTML/CSS/JS
        if (response) {
          return response;
        }
        // 如果缓存里没有，就老老实实去联网请求
        return fetch(event.request);
      })
  );
});

// 3. 激活时：清理旧版本的垃圾缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});