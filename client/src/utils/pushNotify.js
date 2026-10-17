import api from './api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
};

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window;

let swRegistration = null;
const getRegistration = async () => {
  if (!swRegistration) swRegistration = await navigator.serviceWorker.register('/sw.js');
  return swRegistration;
};

// Subscribes the browser to push for a given routeNo. Returns { error } on failure.
export const subscribeToRoute = async (routeNo) => {
  if (!isPushSupported()) return { error: 'Push notifications are not supported in this browser' };
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { error: 'Notification permission denied' };

    const { data } = await api.get('/notify/vapid-public-key');
    if (!data.publicKey) return { error: 'Push is not configured on the server yet' };

    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
    }

    await api.post('/notify/subscribe', { routeNo, subscription: sub.toJSON() });
    return { error: null };
  } catch (e) {
    return { error: e?.response?.data?.error || e.message || 'Could not subscribe' };
  }
};

export const unsubscribeFromRoute = async (routeNo) => {
  try {
    const reg = await getRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/notify/unsubscribe', { endpoint: sub.endpoint, routeNo });
      // Don't call sub.unsubscribe() here — the browser subscription may still
      // be in use for other routes the user follows.
    }
    return { error: null };
  } catch (e) {
    return { error: e.message || 'Could not unsubscribe' };
  }
};
