// sw.js (即使里面什么都不干，只要有 fetch 监听，Chrome 就会认为你是合法 PWA)
self.addEventListener('fetch', function(event) {
    // 留空即可，专门用来触发安装提示
});