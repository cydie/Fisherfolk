import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { api, clearSession, getStoredUser, setSession, type User } from "../api";

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (email, password) => {
        const data = await api<{ token: string; user: User }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setSession(data.token, data.user);
        setUser(data.user);
      },
      logout: () => {
        clearSession();
        setUser(null);
        window.location.href = "/login";
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
