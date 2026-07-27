import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SessionRole = "ADMIN" | "CLINICIAN" | "PATIENT" | null;

const SESSION_COOKIE = "checkupp_web_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const setSessionCookie = (isActive: boolean) => {
  if (typeof document === "undefined") return;

  document.cookie = `${SESSION_COOKIE}=${isActive ? "1" : "0"}; path=/; max-age=${
    isActive ? SESSION_MAX_AGE_SECONDS : 0
  }; samesite=lax`;
};

interface SessionState {
  authReady: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  refreshExpiresAt: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  role: SessionRole;
  setAuthReady: (ready: boolean) => void;
  setSession: (payload: {
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt?: string | null;
    refreshExpiresAt?: string | null;
    userId?: string | null;
    userEmail: string | null;
    userName?: string | null;
    role?: SessionRole;
  }) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      authReady: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      refreshExpiresAt: null,
      userId: null,
      userEmail: null,
      userName: null,
      role: null,
      setAuthReady: (ready) =>
        set({
          authReady: ready,
        }),
      setSession: ({
        accessToken,
        refreshToken,
        expiresAt = null,
        refreshExpiresAt = null,
        userId = null,
        userEmail,
        userName = null,
        role = null,
      }) => {
        set({
          authReady: true,
          accessToken,
          refreshToken,
          expiresAt,
          refreshExpiresAt,
          userId,
          userEmail,
          userName,
          role,
        });
        setSessionCookie(Boolean(accessToken || userEmail));
      },
      clearSession: () => {
        set({
          authReady: true,
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          refreshExpiresAt: null,
          userId: null,
          userEmail: null,
          userName: null,
          role: null,
        });
        setSessionCookie(false);
      },
    }),
    {
      name: "checkupp-clinician-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        refreshExpiresAt: state.refreshExpiresAt,
        userId: state.userId,
        userEmail: state.userEmail,
        userName: state.userName,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setAuthReady(true);
        setSessionCookie(Boolean(state?.accessToken || state?.userEmail));
      },
    },
  ),
);
