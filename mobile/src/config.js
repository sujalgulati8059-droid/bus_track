// The ONE place the app learns where your backend lives.
// Production: set EXPO_PUBLIC_SERVER_URL in eas.json (see LAUNCH_GUIDE.md).
// Local dev:  put EXPO_PUBLIC_SERVER_URL=http://YOUR_LAN_IP:5000 in mobile/.env
const raw = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";
export const SERVER_URL = raw.replace(/\/+$/, "");
export const API_BASE_URL = `${SERVER_URL}/api`;
export const SOCKET_BASE_URL = SERVER_URL;
