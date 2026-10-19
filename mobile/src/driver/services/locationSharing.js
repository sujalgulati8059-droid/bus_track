import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import client from '../api/client';

export const LOCATION_TASK = 'bustrack-driver-location';

let lastPing = {
  lastSent: null,
  retrying: false,
  error: null,
};
const listeners = new Set();

export const subscribePingStatus = (fn) => {
  listeners.add(fn);
  fn(lastPing);
  return () => listeners.delete(fn);
};

export const getLastPingStatus = () => lastPing;

// Defined at module top-level: Android keeps foreground service running
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data || !data.locations || !data.locations.length) {
    lastPing = { ...lastPing, retrying: true, error: error?.message || 'Location error' };
    listeners.forEach((fn) => fn(lastPing));
    return;
  }
  const c = data.locations[data.locations.length - 1].coords;
  try {
    await client.post('/driver/location', {
      lat: c.latitude,
      lng: c.longitude,
      heading: c.heading == null ? undefined : c.heading,
      speed: c.speed == null ? undefined : c.speed,
    });
    lastPing = { lastSent: Date.now(), retrying: false, error: null };
    listeners.forEach((fn) => fn(lastPing));
  } catch (e) {
    lastPing = { ...lastPing, retrying: true, error: e?.response?.data?.error || e.message };
    listeners.forEach((fn) => fn(lastPing));
  }
});

export async function startSharing() {
  try {
    // 1. Check if GPS / Location services are enabled on the device
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return { error: 'GPS is disabled', gpsOff: true };
    }

    // 2. Request Foreground Permission
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      return {
        error: 'Location permission denied',
        permanentlyDenied: !fg.canAskAgain,
      };
    }

    // 3. Stop any existing task before starting
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }

    // 4. Start foreground location service
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'BusTrack - sharing live location',
        notificationBody: 'Students on your route can see your bus live in real time.',
        notificationColor: '#f97316',
      },
    });

    // Fire an immediate one-shot ping so backend gets coordinates right away
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (current?.coords) {
        await client.post('/driver/location', {
          lat: current.coords.latitude,
          lng: current.coords.longitude,
          heading: current.coords.heading == null ? undefined : current.coords.heading,
        });
        lastPing = { lastSent: Date.now(), retrying: false, error: null };
        listeners.forEach((fn) => fn(lastPing));
      }
    } catch (e) {}

    return { error: null };
  } catch (e) {
    return { error: e?.message || 'Could not start location sharing' };
  }
}

export async function stopSharing() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (e) {}
  try {
    await client.post('/driver/location/stop');
  } catch (e) {}
  lastPing = { lastSent: null, retrying: false, error: null };
  listeners.forEach((fn) => fn(lastPing));
}

export async function isSharing() {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  } catch (e) {
    return false;
  }
}
