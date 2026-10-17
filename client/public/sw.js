/* eslint-disable no-restricted-globals */
self.addEventListener('push', (event) => {
  let data = { title: 'BusTrack Pro', body: 'Route status updated.' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.ico',
      tag: data.routeNo ? `route-${data.routeNo}` : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
