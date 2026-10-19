import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getStudentToken, setStudentToken, setUnauthorizedHandler } from '../api/client';
import { getMe, login as loginApi, register as registerApi, updateProfile } from '../api/studentApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(async () => {
    await setStudentToken(null);
    setUser(null);
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
          // 401 is handled by the interceptor; on a network error keep the token and
          // let the user retry instead of silently logging them out.
          if (e?.response) await setStudentToken(null);
        }
      }
      setChecking(false);
    })();
  }, [logout]);

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
    <AuthContext.Provider value={{ user, checking, login, register, logout, changeStop, loginWithSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
