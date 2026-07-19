import React, { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "../api/apiClient";

interface User {
  UserId: number;
  Username: string;
  FullName: string;
  Role: "Admin" | "Staff";
  IsActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "rms_auth";

function loadStoredAuth(): { user: User; token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(() => loadStoredAuth()?.user ?? null);
  const [token, setToken] = useState<string | null>(() => loadStoredAuth()?.token ?? null);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  const login = (loggedInUser: User, accessToken: string) => {
    setUser(loggedInUser);
    setToken(accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: loggedInUser, token: accessToken }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}