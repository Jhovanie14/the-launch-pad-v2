// public/sw.js
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Booking';
    const options = {
      body: data.body || 'You have a new booking',
      icon: data.icon || '/thelaunchpad.png',
      badge: '/thelaunchpad.png',
      tag: data.tag || 'booking-notification',
      requireInteraction: true, // Change to true - notification stays until user interacts
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      silent: false, // Make sure sound is enabled
      data: data.data || {}
    };
  
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  });
  
  self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    
    const urlToOpen = event.notification.data.url || '/admin/booking';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(function(clientList) {
          // Check if there's already a window/tab open with the target URL
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          // If not, open a new window/tab
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  });