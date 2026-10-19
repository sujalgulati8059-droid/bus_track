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

async function verifyGoogleToken(token) {
  if (!token) {
    const err = new Error("Google token is required");
    err.code = "auth/argument-error";
    throw err;
  }

  // 1. Try Firebase Admin if available
  if (adminAuth && typeof adminAuth.verifyIdToken === "function") {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded && decoded.email) {
        return {
          email: decoded.email.toLowerCase(),
          name: decoded.name || decoded.email.split("@")[0],
          sub: decoded.sub || decoded.uid,
          picture: decoded.picture,
          uid: decoded.uid || decoded.sub,
        };
      }
    } catch (fbErr) {
      // Continue to Google tokeninfo fallback
    }
  }

  // 2. Try Google OAuth2 tokeninfo (works directly with Google Sign-In idToken)
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (res.ok) {
      const gData = await res.json();
      if (gData && gData.email) {
        return {
          email: gData.email.toLowerCase(),
          name: gData.name || gData.email.split("@")[0],
          sub: gData.sub,
          picture: gData.picture,
          uid: gData.sub,
        };
      }
    }
  } catch (gErr) {
    console.warn("[Firebase/Google] tokeninfo verification error:", gErr.message);
  }

  const err = new Error("Invalid or unverified Google token");
  err.code = "auth/invalid-id-token";
  throw err;
}

module.exports = {
  app: adminApp,
  auth: () => {
    if (adminAuth) {
      return {
        ...adminAuth,
        verifyIdToken: verifyGoogleToken,
      };
    }
    return {
      verifyIdToken: verifyGoogleToken,
    };
  },
  verifyIdToken: verifyGoogleToken,
  verifyGoogleToken,
};

