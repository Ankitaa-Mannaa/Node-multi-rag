import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  initialized: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  initialized: false,
  setAuth: (user, token, refreshToken) => {
    set({ user, token, refreshToken });
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", token);
      localStorage.setItem("refresh_token", refreshToken);
    }
  },
  setUser: (user) => {
    set({ user });
    if (typeof window !== "undefined") {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    }
  },
  clearAuth: () => {
    set({ user: null, token: null, refreshToken: null, initialized: true });
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
    }
  },
  isAuthenticated: () => {
    return get().token !== null;
  },
  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refresh_token");
      const storedUser = localStorage.getItem("user");
      let user: User | null = null;
      if (storedUser) {
        try {
          user = JSON.parse(storedUser) as User;
        } catch {
          user = null;
        }
      }
      if (token && refreshToken) {
        set({ token, refreshToken, user, initialized: true });
        return;
      }
    }
    set({ initialized: true });
  },
}));
