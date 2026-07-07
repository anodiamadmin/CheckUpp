import {
  deleteSecureItem,
  getSecureJson,
  setSecureJson,
} from "@/lib/storage/secureStore";
import { ScreeningResultRecord } from "@/lib/screening/bookingFlow";

export interface HistoryEntry {
  id: string;
  date: string;
  result: string;
  wasNormal: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningHistory {
  [screeningName: string]: HistoryEntry[];
}

export interface StoredScreeningData {
  age?: number;
  gender?: string;
  calculatedScreeningDates?: string | any[]; // Allow both string and array
  testResults?: string | Record<string, ScreeningResultRecord>; // Allow both string and object
  lastScreeningDate?: string;
  neverScreened?: boolean;
  history?: ScreeningHistory;
  dataCalculated?: boolean; // Track if data has been calculated
}

export interface ScreeningSyncMeta {
  lastSyncedAt?: string | null;
  hasPendingSync: boolean;
  lastSyncError?: string | null;
}

const STORAGE_KEYS = {
  CANCER_HISTORY: "health_screening_cancer_history",
  HEALTH_HISTORY: "health_screening_health_history",
  CANCER_DATA: "health_screening_cancer_data",
  HEALTH_DATA: "health_screening_health_data",
  SYNC_META: "health_screening_sync_meta",
};

// Generic storage operations with better type handling
export const storeData = async (key: string, data: any): Promise<void> => {
  try {
    await setSecureJson(key, data);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    throw error;
  }
};

export const getData = async (key: string): Promise<any> => {
  try {
    return await getSecureJson(key);
  } catch (error) {
    console.error(`Error retrieving data for key ${key}:`, error);
    return null;
  }
};

// History-specific operations
export const addHistoryEntry = async (
  type: "cancer" | "health",
  screeningName: string,
  entry: Omit<HistoryEntry, "id" | "createdAt" | "updatedAt">,
): Promise<void> => {
  const historyKey =
    type === "cancer"
      ? STORAGE_KEYS.CANCER_HISTORY
      : STORAGE_KEYS.HEALTH_HISTORY;

  try {
    const currentHistory = (await getData(historyKey)) || {};

    const newEntry: HistoryEntry = {
      ...entry,
      id: `${screeningName}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!currentHistory[screeningName]) {
      currentHistory[screeningName] = [];
    }

    currentHistory[screeningName].unshift(newEntry); // Add to beginning for chronological order

    await storeData(historyKey, currentHistory);
  } catch (error) {
    console.error("Error adding history entry:", error);
    throw error;
  }
};

export const getHistoryForScreening = async (
  type: "cancer" | "health",
  screeningName: string,
): Promise<HistoryEntry[]> => {
  const historyKey =
    type === "cancer"
      ? STORAGE_KEYS.CANCER_HISTORY
      : STORAGE_KEYS.HEALTH_HISTORY;

  try {
    const history = (await getData(historyKey)) || {};
    return history[screeningName] || [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
};

export const getAllHistory = async (
  type: "cancer" | "health",
): Promise<ScreeningHistory> => {
  const historyKey =
    type === "cancer"
      ? STORAGE_KEYS.CANCER_HISTORY
      : STORAGE_KEYS.HEALTH_HISTORY;

  try {
    return (await getData(historyKey)) || {};
  } catch (error) {
    console.error("Error getting all history:", error);
    return {};
  }
};

export const clearAllHistory = async (
  type: "cancer" | "health",
): Promise<void> => {
  const historyKey =
    type === "cancer"
      ? STORAGE_KEYS.CANCER_HISTORY
      : STORAGE_KEYS.HEALTH_HISTORY;

  try {
    await deleteSecureItem(historyKey);
  } catch (error) {
    console.error("Error clearing history:", error);
    throw error;
  }
};

// Enhanced data storage operations with proper serialization
export const storeCancerData = async (
  data: StoredScreeningData,
): Promise<void> => {
  // Ensure data is properly serialized
  const serializedData = {
    ...data,
    calculatedScreeningDates:
      typeof data.calculatedScreeningDates === "string"
        ? data.calculatedScreeningDates
        : JSON.stringify(data.calculatedScreeningDates || []),
    testResults:
      typeof data.testResults === "string"
        ? data.testResults
        : JSON.stringify(data.testResults || {}),
  };
  await storeData(STORAGE_KEYS.CANCER_DATA, serializedData);
};

export const getCancerData = async (): Promise<StoredScreeningData | null> => {
  return await getData(STORAGE_KEYS.CANCER_DATA);
};

export const storeHealthData = async (
  data: StoredScreeningData,
): Promise<void> => {
  // Ensure data is properly serialized
  const serializedData = {
    ...data,
    calculatedScreeningDates:
      typeof data.calculatedScreeningDates === "string"
        ? data.calculatedScreeningDates
        : JSON.stringify(data.calculatedScreeningDates || []),
    testResults:
      typeof data.testResults === "string"
        ? data.testResults
        : JSON.stringify(data.testResults || {}),
  };
  await storeData(STORAGE_KEYS.HEALTH_DATA, serializedData);
};

export const getHealthData = async (): Promise<StoredScreeningData | null> => {
  return await getData(STORAGE_KEYS.HEALTH_DATA);
};

export const clearAllData = async (): Promise<void> => {
  try {
    await Promise.all([
      deleteSecureItem(STORAGE_KEYS.CANCER_HISTORY),
      deleteSecureItem(STORAGE_KEYS.HEALTH_HISTORY),
      deleteSecureItem(STORAGE_KEYS.CANCER_DATA),
      deleteSecureItem(STORAGE_KEYS.HEALTH_DATA),
      deleteSecureItem(STORAGE_KEYS.SYNC_META),
    ]);
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
};

export const getScreeningSyncMeta = async (): Promise<ScreeningSyncMeta> => {
  try {
    const stored = await getData(STORAGE_KEYS.SYNC_META);
    if (!stored || typeof stored !== "object") {
      return {
        hasPendingSync: false,
        lastSyncedAt: null,
        lastSyncError: null,
      };
    }

    return {
      hasPendingSync: Boolean(stored.hasPendingSync),
      lastSyncedAt:
        typeof stored.lastSyncedAt === "string" ? stored.lastSyncedAt : null,
      lastSyncError:
        typeof stored.lastSyncError === "string" ? stored.lastSyncError : null,
    };
  } catch {
    return {
      hasPendingSync: false,
      lastSyncedAt: null,
      lastSyncError: null,
    };
  }
};

export const setScreeningSyncMeta = async (
  meta: Partial<ScreeningSyncMeta>,
): Promise<void> => {
  const current = await getScreeningSyncMeta();
  await storeData(STORAGE_KEYS.SYNC_META, {
    ...current,
    ...meta,
  });
};
