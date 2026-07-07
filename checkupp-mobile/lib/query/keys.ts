import { QueryKey } from "@tanstack/react-query";

const resolveUserKey = (userId?: string | null) => userId || "anonymous";
const resolveTextKey = (value?: string | null) => value?.trim() || "all";

type KeyFactory<T extends QueryKey> = T;

export const queryKeys = {
  auth: {
    all: ["auth"] as KeyFactory<readonly ["auth"]>,
    session: () => ["auth", "session"] as const,
    profile: () => ["auth", "profile", "me"] as const,
  },
  wallet: {
    all: ["wallet"] as KeyFactory<readonly ["wallet"]>,
    files: (userId?: string | null) =>
      ["wallet", "files", resolveUserKey(userId)] as const,
    searchAll: (userId?: string | null) =>
      ["wallet", "search", resolveUserKey(userId)] as const,
    search: (userId?: string | null, query?: string | null) =>
      [
        ...queryKeys.wallet.searchAll(userId),
        resolveTextKey(query),
      ] as const,
  },
  screenings: {
    all: ["screenings"] as KeyFactory<readonly ["screenings"]>,
    overview: (userId?: string | null) =>
      ["screenings", "overview", resolveUserKey(userId)] as const,
    cancer: (userId?: string | null) =>
      ["screenings", "cancer", resolveUserKey(userId)] as const,
    health: (userId?: string | null) =>
      ["screenings", "health", resolveUserKey(userId)] as const,
    history: (userId: string | null | undefined, type: "cancer" | "health") =>
      ["screenings", "history", type, resolveUserKey(userId)] as const,
    syncMeta: (userId?: string | null) =>
      ["screenings", "sync-meta", resolveUserKey(userId)] as const,
  },
  pregnancy: {
    all: ["pregnancy"] as KeyFactory<readonly ["pregnancy"]>,
    plan: (userId?: string | null) =>
      ["pregnancy", "plan", resolveUserKey(userId)] as const,
  },
  practiceContacts: {
    all: ["practice-contacts"] as KeyFactory<readonly ["practice-contacts"]>,
    list: () => ["practice-contacts", "list"] as const,
    screening: (screeningName?: string | null) =>
      [
        "practice-contacts",
        "screening",
        resolveTextKey(screeningName),
      ] as const,
    default: () => ["practice-contacts", "default"] as const,
  },
  immunisation: {
    all: ["immunisation"] as KeyFactory<readonly ["immunisation"]>,
    list: (page = 1, pageSize = 20) =>
      ["immunisation", "list", page, pageSize] as const,
    detail: (recordId?: string | null) =>
      ["immunisation", "detail", resolveTextKey(recordId)] as const,
    summary: (daysAhead = 30) =>
      ["immunisation", "summary", daysAhead] as const,
    upcoming: (page = 1, pageSize = 20) =>
      ["immunisation", "upcoming", page, pageSize] as const,
  },
  consent: {
    all: ["consent"] as KeyFactory<readonly ["consent"]>,
    pending: () => ["consent", "pending", "REQUESTED"] as const,
    history: (status: string) => ["consent", "history", status] as const,
  },
  feedback: {
    all: ["feedback"] as KeyFactory<readonly ["feedback"]>,
    mine: (userId?: string | null) =>
      ["feedback", "mine", resolveUserKey(userId)] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
