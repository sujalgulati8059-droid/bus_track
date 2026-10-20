import React, { createContext, useContext, useEffect, useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getDriverToken, setDriverToken } from '../api/client';
import { getMe, login as apiLogin, googleLogin as apiGoogleLogin, registerDriver } from '../api/driverApi';

try {
  GoogleSignin.configure({
    webClientId: '836483789246-34i8nmdos28ma5cg0qb3lhs13vunbm0d.apps.googleusercontent.com',
  });
} catch (e) {
  console.warn('GoogleSignin.configure failed:', e?.message);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [checking, setChecking] = useState(true);

  // Only drop the token when the server says it is invalid; a bad network must not log the driver out.
  useEffect(() => {
    (async () => {
      try {
        const token = await getDriverToken();
        if (token) {
          try {
            const res = await getMe();
            setDriver(res.data.driver);
          } catch (e) {
            const code = e?.response?.status;
            if (code === 401 || code === 403 || code === 404) await setDriverToken(null);
          }
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const loginWithPhone = async (phone, password) => {
    const res = await apiLogin(phone, password);
    await setDriverToken(res.token);
    setDriver(res.data.driver);
    return res;
  };

  const signUp = async (form) => {
    const res = await registerDriver(form);
    await setDriverToken(res.token);
    setDriver(res.data.driver);
    return res;
  };

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    const res = await apiGoogleLogin(idToken);
    if (res.isNewDriver) {
      return res;
    }
    if (res.token) {
      await setDriverToken(res.token);
      setDriver(res.data.driver);
    }
    return res;
  };

  const completeGoogleRegistration = async ({ googleToken, routeNo, phone, password }) => {
    const res = await apiGoogleLogin({
      idToken: googleToken,
      routeNo,
      phone,
      password: password || undefined,
    });
    if (res.token) {
      await setDriverToken(res.token);
      setDriver(res.data.driver);
    }
    return res;
  };

  const logout = async () => {
    await setDriverToken(null);
    setDriver(null);
    try {
      await GoogleSignin.signOut();
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        driver,
        checking,
        loginWithPhone,
        signUp,
        signInWithGoogle,
        completeGoogleRegistration,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
