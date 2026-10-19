import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDriverToken, setDriverToken } from '../api/client';
import { getMe, login as apiLogin } from '../api/driverApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [driver, setDriver] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getDriverToken();
      if (token) {
        try {
          const res = await getMe();
          setDriver(res.data.driver);
        } catch {
          await setDriverToken(null);
        }
      }
      setChecking(false);
    })();
  }, []);

  const loginWithEmail = async (identifier, password) => {
    const res = await apiLogin(identifier, password);
    await setDriverToken(res.token);
    setDriver(res.data.driver);
    return res;
  };

  const logout = async () => {
    await setDriverToken(null);
    setDriver(null);
  };

  return (
    <AuthContext.Provider value={{ driver, checking, loginWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
