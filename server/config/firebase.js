let adminApp = null;
let adminAuth = null;

try {
  let getApps, initializeApp, cert, getAuth;
  try {
    const appModule = require('firebase-admin/app');
    getApps = appModule.getApps;
    initializeApp = appModule.initializeApp;
    cert = appModule.cert;
  } catch {}

  try {
    const authModule = require('firebase-admin/auth');
    getAuth = authModule.getAuth;
  } catch {}

  if (!getApps || !initializeApp) {
    const admin = require('firebase-admin');
    getApps = admin.getApps || (() => admin.apps || []);
    initializeApp = admin.initializeApp;
    cert = admin.credential?.cert || admin.cert;
    getAuth = (app) => (admin.auth ? admin.auth(app) : null);
  }

  const existingApps = getApps ? getApps() : [];
  if (!existingApps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert ? cert({ projectId, clientEmail, privateKey }) : undefined,
      });
      adminAuth = getAuth ? getAuth(adminApp) : null;
      console.log('[Firebase] Admin initialized successfully');
    } else {
      console.log('[Firebase] Env vars not set; Google Auth will be disabled.');
    }
  } else {
    adminApp = existingApps[0];
    adminAuth = getAuth ? getAuth(adminApp) : null;
  }
} catch (err) {
  console.warn('[Firebase] Initialization skipped:', err.message);
}

module.exports = {
  app: adminApp,
  auth: () => {
    if (!adminAuth) {
      const err = new Error('Firebase Auth is not configured on this server');
      err.code = 'auth/not-configured';
      throw err;
    }
    return adminAuth;
  },
  verifyIdToken: async (token) => {
    if (!adminAuth) {
      const err = new Error('Firebase Auth is not configured on this server');
      err.code = 'auth/not-configured';
      throw err;
    }
    return await adminAuth.verifyIdToken(token);
  }
};
