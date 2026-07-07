import { SetStateAction } from "react";
import { create } from "zustand";

export interface AppUser {
  id?: string;
  $id?: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  role?: string | null;
  phoneNumber?: string | null;
  dob?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  $createdAt?: string;
  $updatedAt?: string;
  [key: string]: any;
}

interface AppStoreState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
  isLoggedIn: boolean;
  user: AppUser | null;
  userId: string | null;
  loading: boolean;
  emailVerified: boolean;
  profileResolved: boolean;
  setIsLoggedIn: (value: boolean) => void;
  setUser: (value: SetStateAction<Record<string, any> | null>) => void;
  setLoading: (value: boolean) => void;
  setEmailVerified: (value: boolean) => void;
  setProfileResolved: (value: boolean) => void;
  setAuthSession: (
    value: {
      accessToken?: string | null;
      refreshToken?: string | null;
      accessTokenExpiresAt?: string | null;
      refreshTokenExpiresAt?: string | null;
    } | null,
  ) => void;
  resetAuthState: () => void;
}

const normalizeGender = (value: unknown): string | null => {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === "MALE") return "male";
  if (normalized === "FEMALE") return "female";
  if (normalized === "PREFER_NOT_TO_SAY") return "prefer not to say";
  if (normalized === "UNKNOWN") return null;

  return value;
};

const normalizeUser = (rawUser: any): AppUser | null => {
  if (!rawUser || typeof rawUser !== "object") return null;

  const id = rawUser.$id || rawUser.id;
  if (!id) return null;

  const createdAt = rawUser.$createdAt || rawUser.createdAt;
  const updatedAt = rawUser.$updatedAt || rawUser.updatedAt;
  const avatarUrl =
    typeof rawUser.avatarUrl === "string" && rawUser.avatarUrl.trim()
      ? rawUser.avatarUrl.trim()
      : typeof rawUser.avatar === "string" && rawUser.avatar.trim()
        ? rawUser.avatar.trim()
        : null;

  return {
    ...rawUser,
    avatarUrl,
    avatar: avatarUrl,
    id,
    $id: id,
    createdAt,
    updatedAt,
    $createdAt: createdAt,
    $updatedAt: updatedAt,
    gender: normalizeGender(rawUser.gender),
  } as AppUser;
};

export const useAppStore = create<AppStoreState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  accessTokenExpiresAt: null,
  refreshTokenExpiresAt: null,
  isLoggedIn: false,
  user: null,
  userId: null,
  loading: true,
  emailVerified: false,
  profileResolved: false,
  setIsLoggedIn: (value) => set({ isLoggedIn: value }),
  setUser: (valueOrUpdater) => {
    const currentUser = get().user;
    const nextValue =
      typeof valueOrUpdater === "function"
        ? (valueOrUpdater as (current: AppUser | null) => AppUser | null)(
            currentUser,
          )
        : valueOrUpdater;

    const normalized = normalizeUser(nextValue);
    set({
      user: normalized,
      userId: normalized?.$id ?? normalized?.id ?? null,
    });
  },
  setLoading: (value) => set({ loading: value }),
  setEmailVerified: (value) => set({ emailVerified: value }),
  setProfileResolved: (value) => set({ profileResolved: value }),
  setAuthSession: (value) =>
    set({
      accessToken: value?.accessToken ?? null,
      refreshToken: value?.refreshToken ?? null,
      accessTokenExpiresAt: value?.accessTokenExpiresAt ?? null,
      refreshTokenExpiresAt: value?.refreshTokenExpiresAt ?? null,
    }),
  resetAuthState: () =>
    set({
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      isLoggedIn: false,
      user: null,
      userId: null,
      loading: false,
      emailVerified: false,
      profileResolved: false,
    }),
}));
