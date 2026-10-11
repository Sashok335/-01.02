import { useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import { me, login as apiLogin, register as apiRegister } from "../api/auth";
import { setToken, getToken } from "../api/client";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;

    me()
      .then(setUser)
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  async function enter(apiCall, values) {
    const data = await apiCall(values);
    setToken(data.token);
    setUser(data.user);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  const login = (email, password) => enter(apiLogin, { email, password });
  const register = (fullName, email, password) => enter(apiRegister, { fullName, email, password });

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checking, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
