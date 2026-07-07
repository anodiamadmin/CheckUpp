import {
  getCancerData,
  getHealthData,
  getScreeningSyncMeta,
  ScreeningSyncMeta,
  StoredScreeningData,
} from "@/lib/storage/screeningStorage";
import {
  fetchUserCancerScreeningData,
  fetchUserNutritionData,
} from "@/lib/appwrite/appwrite";
import { queryKeys } from "@/lib/query/keys";
import useApiQuery from "@/lib/query/useApiQuery";

export type ScreeningOverviewStatus =
  | "loading"
  | "local"
  | "server"
  | "empty"
  | "pending-sync"
  | "error";

export type ScreeningOverviewItem = {
  name?: string;
  date?: string;
  eligible?: boolean;
  completed?: boolean;
  screeningType?: "cancer" | "health";
};

export type ScreeningOverviewData = {
  upcomingScreenings: ScreeningOverviewItem[];
  completedScreenings: number;
  totalScreenings: number;
  status: ScreeningOverviewStatus;
  allScreenings: ScreeningOverviewItem[];
};

const EMPTY_SYNC_META: ScreeningSyncMeta = {
  hasPendingSync: false,
  lastSyncedAt: null,
  lastSyncError: null,
};

export const EMPTY_SCREENING_OVERVIEW: ScreeningOverviewData = {
  upcomingScreenings: [],
  completedScreenings: 0,
  totalScreenings: 0,
  status: "empty",
  allScreenings: [],
};

const parseScreenings = (value: unknown): ScreeningOverviewItem[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as ScreeningOverviewItem[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as ScreeningOverviewItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeOverviewItems = (
  entries: unknown,
  screeningType: "cancer" | "health",
) =>
  parseScreenings(entries)
    .filter((item) => item?.eligible)
    .map((item) => ({ ...item, screeningType }));

const finalizeOverview = (
  items: ScreeningOverviewItem[],
  status: ScreeningOverviewStatus,
): ScreeningOverviewData => {
  const sorted = [...items].sort((left, right) => {
    const leftDate = left.date
      ? new Date(left.date).getTime()
      : Number.MAX_SAFE_INTEGER;
    const rightDate = right.date
      ? new Date(right.date).getTime()
      : Number.MAX_SAFE_INTEGER;
    return leftDate - rightDate;
  });

  return {
    allScreenings: sorted,
    upcomingScreenings: sorted.filter((item) => !item.completed).slice(0, 3),
    completedScreenings: sorted.filter((item) => Boolean(item.completed))
      .length,
    totalScreenings: sorted.length,
    status,
  };
};

export const buildScreeningOverviewData = ({
  cancerData,
  healthData,
  syncMeta,
  status,
}: {
  cancerData?: Partial<StoredScreeningData> | null;
  healthData?: Partial<StoredScreeningData> | null;
  syncMeta?: Partial<ScreeningSyncMeta> | null;
  status?: ScreeningOverviewStatus;
}): ScreeningOverviewData => {
  const resolvedSyncMeta = {
    ...EMPTY_SYNC_META,
    ...(syncMeta || {}),
  };

  const items = [
    ...normalizeOverviewItems(cancerData?.calculatedScreeningDates, "cancer"),
    ...normalizeOverviewItems(healthData?.calculatedScreeningDates, "health"),
  ];

  const resolvedStatus =
    status ||
    (resolvedSyncMeta.hasPendingSync
      ? "pending-sync"
      : items.length > 0
        ? "local"
        : "empty");

  return finalizeOverview(items, resolvedStatus);
};

export const loadScreeningOverviewData = async (
  userId?: string | null,
): Promise<ScreeningOverviewData> => {
  try {
    const [cancerData, healthData, syncMeta] = await Promise.all([
      getCancerData(),
      getHealthData(),
      getScreeningSyncMeta(),
    ]);

    const localOverview = buildScreeningOverviewData({
      cancerData,
      healthData,
      syncMeta,
    });

    if (
      localOverview.totalScreenings > 0 ||
      syncMeta.hasPendingSync ||
      !userId
    ) {
      return localOverview;
    }

    const [remoteCancerRows, remoteHealthRows] = await Promise.all([
      fetchUserCancerScreeningData(userId).catch(() => []),
      fetchUserNutritionData(userId).catch(() => []),
    ]);

    return buildScreeningOverviewData({
      cancerData: {
        calculatedScreeningDates:
          remoteCancerRows?.[0]?.calculatedScreeningDates,
      },
      healthData: {
        calculatedScreeningDates: remoteHealthRows?.[0]?.checkupDates,
      },
      syncMeta,
      status:
        remoteCancerRows?.length || remoteHealthRows?.length
          ? "server"
          : "empty",
    });
  } catch (error) {
    console.error("Failed to load screening overview:", error);
    return {
      ...EMPTY_SCREENING_OVERVIEW,
      status: "error",
    };
  }
};

export const useScreeningOverview = (userId?: string | null) =>
  useApiQuery(() => loadScreeningOverviewData(userId), {
    deps: [userId],
    queryKey: queryKeys.screenings.overview(userId),
  });
