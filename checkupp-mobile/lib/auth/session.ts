import { useAppStore } from "@/lib/state/appStore";
import {
  deleteSecureItem,
  getSecureJson,
  setSecureJson,
} from "@/lib/storage/secureStore";

const AUTH_SESSION_STORAGE_KEY = "auth_session";

type SessionUser = Record<string, any> | null;

export interface AuthSession {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  user: SessionUser;
}

export interface AuthResponseData {
  user: Record<string, any>;
  token: string;
  refreshToken: string;
  expiresAt?: string | null;
  refreshExpiresAt?: string | null;
}

interface PersistAuthSessionOptions {
  syncStore?: boolean;
}

const normalizeAuthSession = (
  session: Partial<AuthSession> | null | undefined,
): AuthSession | null => {
  if (!session) return null;

  const normalized: AuthSession = {
    accessToken: session.accessToken ?? null,
    refreshToken: session.refreshToken ?? null,
    accessTokenExpiresAt: session.accessTokenExpiresAt ?? null,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt ?? null,
    user:
      session.user && typeof session.user === "object"
        ? (session.user as Record<string, any>)
        : null,
  };

  if (!normalized.accessToken && !normalized.refreshToken && !normalized.user) {
    return null;
  }

  return normalized;
};

export const buildAuthSession = (data: AuthResponseData): AuthSession => ({
  accessToken: data.token ?? null,
  refreshToken: data.refreshToken ?? null,
  accessTokenExpiresAt: data.expiresAt ?? null,
  refreshTokenExpiresAt: data.refreshExpiresAt ?? null,
  user:
    data.user && typeof data.user === "object"
      ? (data.user as Record<string, any>)
      : null,
});

export const syncAuthSessionToStore = (session: AuthSession | null) => {
  const state = useAppStore.getState();

  if (!session) {
    state.resetAuthState();
    return;
  }

  state.setAuthSession(session);
  state.setUser(session.user);
  state.setEmailVerified(Boolean(session.user?.emailVerified));
  state.setIsLoggedIn(Boolean(session.accessToken || session.refreshToken));
  state.setProfileResolved(Boolean(session.user));
};

export const getStoredAuthSession = async (): Promise<AuthSession | null> => {
  const session = await getSecureJson<AuthSession>(AUTH_SESSION_STORAGE_KEY);
  return normalizeAuthSession(session);
};

export const persistAuthSession = async (
  session: Partial<AuthSession> | null,
  options: PersistAuthSessionOptions = {},
): Promise<AuthSession | null> => {
  const { syncStore = true } = options;
  const normalized = normalizeAuthSession(session);

  if (!normalized) {
    await clearAuthSession();
    return null;
  }

  await setSecureJson(AUTH_SESSION_STORAGE_KEY, normalized);
  if (syncStore) {
    syncAuthSessionToStore(normalized);
  }
  return normalized;
};

export const updateStoredSessionUser = async (
  user: Record<string, any> | null,
): Promise<AuthSession | null> => {
  const existingSession = await getStoredAuthSession();
  if (!existingSession) {
    syncAuthSessionToStore(null);
    return null;
  }

  const updatedSession = await persistAuthSession({
    ...existingSession,
    user,
  });

  const state = useAppStore.getState();
  state.setUser(user);
  state.setEmailVerified(Boolean(user?.emailVerified));
  state.setProfileResolved(true);

  return updatedSession;
};

export const hydrateStoredAuthSession =
  async (): Promise<AuthSession | null> => {
    const session = await getStoredAuthSession();
    syncAuthSessionToStore(session);
    return session;
  };

export const clearAuthSession = async () => {
  await deleteSecureItem(AUTH_SESSION_STORAGE_KEY);
  syncAuthSessionToStore(null);
};
