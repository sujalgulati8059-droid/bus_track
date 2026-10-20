import client from './client';

// ---- Public data & live ETA (no login needed) ----
export const getRoutes = () => client.get('/routes?limit=116').then((r) => r.data.routes || []);
export const getStops = () => client.get('/stops').then((r) => r.data.data || []);
export const searchBuses = (source, destination) =>
  client.post('/search', { source, destination }).then((r) => r.data.data || []);
export const getBusStatusToday = () =>
  client.get('/bus-status/today').then((r) => r.data.data || []);
export const getBusEta = (route, stop) =>
  client
    .get(`/bus-status/eta?route=${encodeURIComponent(route)}&stop=${encodeURIComponent(stop)}`)
    .then((r) => r.data);
