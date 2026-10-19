import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getStudentToken, setStudentToken, setUnauthorizedHandler } from '../api/client';
import {
  getMe,
  login as loginApi,
  register as registerApi,
  updateProfile,
  googleLogin as googleLoginApi,
} from '../api/studentApi';

try {
  GoogleSignin.configure({
    webClientId: '836483789246-34i8nmdos28ma5cg0qb3lhs13vunbm0d.apps.googleusercontent.com',
  });
} catch (e) {
  console.warn('GoogleSignin.configure skipped/failed:', e?.message);
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(async () => {
    await setStudentToken(null);
    setUser(null);
    try {
      await GoogleSignin.signOut();
    } catch {}
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      const token = await getStudentToken();
      if (token) {
        try {
          const res = await getMe();
          setUser(res.data.user);
        } catch (e) {
          if (e?.response) await setStudentToken(null);
        }
      }
      setChecking(false);
    })();
  }, [logout]);

  const signInWithGoogle = async () => {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    const res = await googleLoginApi(idToken);
    if (res.isNewStudent) {
      return res;
    }
    if (res.token) {
      await setStudentToken(res.token);
      setUser(res.data.user);
    }
    return res;
  };

  const completeGoogleRegistration = async ({
    googleToken,
    assignedRoute,
    assignedStop,
    assignedStops,
  }) => {
    const res = await googleLoginApi({
      idToken: googleToken,
      assignedRoute,
      assignedStop,
      assignedStops,
    });
    if (res.token) {
      await setStudentToken(res.token);
      setUser(res.data.user);
    }
    return res;
  };

  const login = async (phone, password) => {
    const res = await loginApi(phone.trim(), password);
    await setStudentToken(res.token);
    setUser(res.data.user);
  };

  const register = async (form) => {
    const res = await registerApi(form);
    await setStudentToken(res.token);
    setUser(res.data.user);
  };

  const changeStop = async (assignedStop) => {
    const res = await updateProfile({ assignedStop });
    setUser(res.data.user);
  };

  const loginWithSession = async (token, userObj) => {
    await setStudentToken(token);
    setUser(userObj);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        checking,
        signInWithGoogle,
        completeGoogleRegistration,
        login,
        register,
        logout,
        changeStop,
        loginWithSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
