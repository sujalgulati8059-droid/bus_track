import client from './client';

// ---- Driver Signup & Approval Flow ----
export const sendDriverSignupOtp = (phone) =>
  client.post('/driver/signup/otp/send', { phone }).then((r) => r.data);

export const verifyDriverSignupOtp = ({ name, phone, otp, requestedRoute }) =>
  client.post('/driver/signup/otp/verify', { name, phone, otp, requestedRoute }).then((r) => r.data);

export const submitDriverSignupRequest = ({ signupToken, password }) =>
  client
    .post('/driver/signup/request', { signupToken, password })
    .then((r) => r.data);

export const getDriverSignupStatus = (phone) =>
  client.get(`/driver/signup/status?phone=${encodeURIComponent(phone)}`).then((r) => r.data);

// ---- Driver Login via Phone OTP ----
export const sendDriverLoginOtp = (phone) =>
  client.post('/driver/login/otp/send', { phone }).then((r) => r.data);

export const verifyDriverLoginOtp = (phone, otp) =>
  client.post('/driver/login/otp/verify', { phone, otp }).then((r) => r.data);

export const setupPassword = (password, setupToken) =>
  client.post('/driver/password/setup', { password, setupToken }).then((r) => r.data);

// ---- Driver Email / ID & Password Login ----
export const login = (identifier, password) =>
  client.post('/driver/login', { email: identifier, phone: identifier, password }).then((r) => r.data);

export const googleLogin = (idToken) =>
  client.post('/driver/auth/google', { idToken }).then((r) => r.data);

export const registerDriver = (form) =>
  client.post('/driver/register', form).then((r) => r.data);

// ---- Trip Lifecycle ----
export const startDriverTrip = () => client.post('/driver/trip/start').then((r) => r.data);
export const stopDriverTrip = () => client.post('/driver/trip/stop').then((r) => r.data);

// ---- Routes & Passenger Breakdown ----
export const getRoutes = () =>
  client.get('/routes?limit=116').then((r) => r.data.routes || []);

export const getMe = () => client.get('/driver/me').then((r) => r.data);

export const getMyRoute = () => client.get('/driver/route').then((r) => r.data);

export const updateDaySchedule = (day, { stops, departureTime, skip }) =>
  client
    .put(`/driver/route/schedule/${day}`, { stops, departureTime, skip })
    .then((r) => r.data);

export const setTodayStatus = (isWorking, reason) =>
  client.put('/driver/status', { isWorking, reason }).then((r) => r.data);

export const getPassengers = () => client.get('/driver/passengers').then((r) => r.data);
