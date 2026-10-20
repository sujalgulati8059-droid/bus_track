import client from './client';

// ---- Driver login / sign-up (Route ID, email or mobile + password) ----
export const login = (identifier, password) =>
  client.post('/driver/login', { email: identifier, phone: identifier, password }).then((r) => r.data);

export const registerDriver = (form) =>
  client.post('/driver/register', form).then((r) => r.data);

// ---- Trip Lifecycle ----
export const startDriverTrip = () => client.post('/driver/trip/start').then((r) => r.data);
export const stopDriverTrip = () => client.post('/driver/trip/stop').then((r) => r.data);

// ---- Routes & Passenger Breakdown ----
export const getRoutes = () =>
  client.get('/routes?limit=116').then((r) => r.data.routes || []);

export const getMe = () => client.get('/driver/me').then((r) => r.data);
export const updateDriverProfile = (data) => client.put('/driver/profile', data).then((r) => r.data);

export const getMyRoute = () => client.get('/driver/route').then((r) => r.data);

export const updateDaySchedule = (day, { stops, departureTime, skip }) =>
  client
    .put(`/driver/route/schedule/${day}`, { stops, departureTime, skip })
    .then((r) => r.data);

export const setTodayStatus = (isWorking, reason) =>
  client.put('/driver/status', { isWorking, reason }).then((r) => r.data);

export const getPassengers = () => client.get('/driver/passengers').then((r) => r.data);
