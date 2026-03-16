// public/sw.js
// 서비스 워커: 백그라운드 푸시 알림 수신 및 클릭 처리

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', // 아이콘 경로 (필요시 추가)
      badge: '/badge.png', // 뱃지 경로 (필요시 추가)
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
