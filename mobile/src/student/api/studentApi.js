import client from './client';

// ---- Phone-OTP Student Signup Flow ----
export const sendSignupOtp = (phone) =>
  client.post('/users/otp/send', { phone }).then((r) => r.data);

export const verifySignupOtp = (phone, otp) =>
  client.post('/users/otp/verify', { phone, otp }).then((r) => r.data);

export const verifyUid = (uid, signupToken) =>
  client
    .post(
      '/users/uid/verify',
      { uid },
      { headers: { Authorization: `Bearer ${signupToken}` } }
    )
    .then((r) => r.data);

export const completeSignup = (payload, signupToken) =>
  client
    .post('/users/signup/complete', payload, {
      headers: { Authorization: `Bearer ${signupToken}` },
    })
    .then((r) => r.data);

export const setupPassword = (password, setupToken) =>
  client
    .post('/users/password/setup', { password }, {
      headers: { Authorization: `Bearer ${setupToken}` },
    })
    .then((r) => r.data);

// ---- Returning Student Phone-OTP Login ----
export const sendLoginOtp = (phone) =>
  client.post('/users/login/otp/send', { phone }).then((r) => r.data);

export const verifyLoginOtp = (phone, otp) =>
  client.post('/users/login/otp/verify', { phone, otp }).then((r) => r.data);

export const googleLogin = (payload) =>
  client
    .post('/users/auth/google', typeof payload === 'string' ? { idToken: payload } : payload)
    .then((r) => r.data);

// ---- Legacy Auth / Profile ----
export const login = (phone, password) =>
  client.post('/users/login', { phone, password }).then((r) => r.data);
export const register = (form) =>
  client.post('/student/register', form).then((r) => r.data);
export const getMe = () => client.get('/student/me').then((r) => r.data);
export const updateProfile = (body) => client.put('/student/profile', body).then((r) => r.data);

// ---- Daily "am I going today?" ----
export const getTodayTravel = () =>
  client.get('/student/travel-status/today').then((r) => r.data.data.status);
export const setTravelStatus = (going, stop) =>
  client.post('/student/travel-status', { going, stop }).then((r) => r.data);

// ---- Public Data & Live ETA ----
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
