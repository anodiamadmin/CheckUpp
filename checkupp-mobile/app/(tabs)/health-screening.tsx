import { useToast } from "@/components/ToastProvider";
import LoadingSpinner from "@/components/LoadingSpinner";
import UploadModal from "@/components/UploadModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, RefreshControl, ScrollView, Platform } from "react-native";
import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import ScreeningTabs from "@/components/screening/ScreeningTabs";
import HealthCheckForm from "@/components/screening/HealthCheckForm";
import ScreeningActions from "@/components/screening/ScreeningActions";
import ScreeningSchedule from "@/components/screening/ScreeningSchedule";
import CancerScreeningForm from "@/components/screening/CancerScreeningForm";

import {
  saveNutritionData,
  deleteNutritionData,
  fetchUserNutritionData,
  saveCancerScreeningData,
  deleteCancerScreeningData,
  fetchUserCancerScreeningData,
} from "@/lib/appwrite/appwrite";
import { addDatesToCalendar } from "@/lib/notifications/calendar";
import {
  ScreeningItem,
  buildCancerScreenings,
} from "@/lib/utils/cancerScreeningChecks";
import {
  HealthCheckItem,
  buildHealthChecks,
} from "@/lib/utils/nutritionChecks";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { cancelSelectedNotifications } from "@/lib/notifications/cancelAllNotifications";
import { convertDateFormat, formatDate } from "@/lib/utils/dateFormatConverter";
import { getNotificationIdentifiersByTitles } from "@/lib/notifications/getNotifications";
import { scale, getSpacing } from "@/lib/utils/responsiveUtils";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import {
  BOOKING_REQUIRED_RESULT,
  BookingChannel,
  BookingStatus,
  BookingStatusDetails,
  ScreeningResultRecord,
} from "@/lib/screening/bookingFlow";

import {
  clearAllData,
  getHealthData,
  getAllHistory,
  getCancerData,
  storeCancerData,
  storeHealthData,
  addHistoryEntry,
  ScreeningHistory,
  getScreeningSyncMeta,
  setScreeningSyncMeta,
} from "@/lib/storage/screeningStorage";
import { queryKeys } from "@/lib/query/keys";
import {
  buildScreeningOverviewData,
  loadScreeningOverviewData,
} from "@/lib/features/screenings/overview";

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const extraPadding = getSpacing(24);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

export type Gender = "male" | "female" | "prefer not to say";

interface LocalStorageData {
  age: number;
  gender: Gender;
  neverScreened: boolean;
  lastScreeningDate?: string;
  calculatedScreeningDates: any[];
  testResults: Record<string, ScreeningResultRecord>;
  lastModified: string;
}

interface SaveToStorageOverrides {
  neverScreenedCancer?: boolean;
  cancerScreeningDate?: Date | undefined;
  cancerResults?: Record<string, ScreeningResultRecord>;
  neverCheckedHealth?: boolean;
  healthCheckDate?: Date | undefined;
  healthResults?: Record<string, ScreeningResultRecord>;
}

type SyncState = "idle" | "syncing" | "synced" | "failed" | "offline-pending";

const parseJsonField = <T,>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
};

const toTimestamp = (value?: string | null) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const normalizeGender = (value: unknown, fallback: Gender): Gender => {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toUpperCase();
  if (normalized === "MALE") return "male";
  if (normalized === "FEMALE") return "female";
  if (normalized === "PREFER_NOT_TO_SAY") return "prefer not to say";
  if (normalized === "PREFER NOT TO SAY") return "prefer not to say";

  return fallback;
};

const toDateOrUndefined = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const HealthScreeningPage = () => {
  const { user, userId } = useGlobalContext();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const docUpload = useDocumentUpload({ userId, showToast });

  // Get initial tab from params with fallback
  const initialTab = useMemo(() => {
    const tabParam = params.initialTab as string;
    return tabParam === "cancer" || tabParam === "health" ? tabParam : "health";
  }, [params.initialTab]);

  const [age, setAge] = useState<number | undefined>(undefined);
  const [gender, setGender] = useState<Gender>(
    normalizeGender(user?.gender, "male"),
  );
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"cancer" | "health">(initialTab);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSyncingRef = useRef(false);
  const isInitialDataLoadingRef = useRef(false);
  const lastInitialLoadAtRef = useRef(0);

  // Cancer screening state
  const [neverScreenedCancer, setNeverScreenedCancer] =
    useState<boolean>(false);
  const [cancerScreeningDate, setCancerScreeningDate] = useState<
    Date | undefined
  >(undefined);
  const [cancerScreeningDates, setCancerScreeningDates] = useState<
    ScreeningItem[]
  >([]);
  const [testResults, setTestResults] = useState<
    Record<string, ScreeningResultRecord>
  >({});

  // Health check state
  const [neverCheckedHealth, setNeverCheckedHealth] = useState<boolean>(false);
  const [healthCheckDate, setHealthCheckDate] = useState<Date | undefined>(
    undefined,
  );
  const [healthCheckDates, setHealthCheckDates] = useState<HealthCheckItem[]>(
    [],
  );
  const [healthResults, setHealthResults] = useState<
    Record<string, ScreeningResultRecord>
  >({});

  // History state
  const [cancerHistory, setCancerHistory] = useState<ScreeningHistory>({});
  const [healthHistory, setHealthHistory] = useState<ScreeningHistory>({});

  // Update active tab when params change
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const computeAge = useCallback((dob: string | undefined) => {
    if (!dob) return undefined;
    try {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age > 0 ? age : undefined;
    } catch (error) {
      console.error("Error computing age:", error);
      return undefined;
    }
  }, []);

  const saveToStorage = useCallback(
    async (
      overrideCancerDates?: ScreeningItem[],
      overrideHealthDates?: HealthCheckItem[],
      overrides: SaveToStorageOverrides = {},
    ) => {
      try {
        if (!age || !gender) return;

        const currentTimestamp = new Date().toISOString();
        const effectiveNeverScreenedCancer =
          "neverScreenedCancer" in overrides
            ? Boolean(overrides.neverScreenedCancer)
            : neverScreenedCancer;
        const effectiveCancerDate =
          "cancerScreeningDate" in overrides
            ? overrides.cancerScreeningDate
            : cancerScreeningDate;
        const effectiveCancerResults =
          "cancerResults" in overrides
            ? overrides.cancerResults || {}
            : testResults || {};

        const effectiveNeverCheckedHealth =
          "neverCheckedHealth" in overrides
            ? Boolean(overrides.neverCheckedHealth)
            : neverCheckedHealth;
        const effectiveHealthDate =
          "healthCheckDate" in overrides
            ? overrides.healthCheckDate
            : healthCheckDate;
        const effectiveHealthResults =
          "healthResults" in overrides
            ? overrides.healthResults || {}
            : healthResults || {};

        const cancerData: LocalStorageData = {
          age,
          gender,
          neverScreened: effectiveNeverScreenedCancer,
          lastScreeningDate: effectiveCancerDate?.toISOString(),
          calculatedScreeningDates:
            overrideCancerDates || cancerScreeningDates || [],
          testResults: effectiveCancerResults,
          lastModified: currentTimestamp,
        };

        const healthData: LocalStorageData = {
          age,
          gender,
          neverScreened: effectiveNeverCheckedHealth,
          lastScreeningDate: effectiveHealthDate?.toISOString(),
          calculatedScreeningDates:
            overrideHealthDates || healthCheckDates || [],
          testResults: effectiveHealthResults,
          lastModified: currentTimestamp,
        };

        await Promise.all([
          storeCancerData(cancerData),
          storeHealthData(healthData),
        ]);
        await setScreeningSyncMeta({
          hasPendingSync: true,
          lastSyncError: null,
        });
        queryClient.setQueryData(
          queryKeys.screenings.overview(userId),
          buildScreeningOverviewData({
            cancerData,
            healthData,
            syncMeta: {
              hasPendingSync: true,
              lastSyncedAt,
              lastSyncError: null,
            },
          }),
        );
      } catch (error) {
        console.error("Error saving to secure local storage:", error);
        showToast("Failed to save data locally", "error");
      }
    },
    [
      age,
      gender,
      neverScreenedCancer,
      cancerScreeningDate,
      cancerScreeningDates,
      testResults,
      neverCheckedHealth,
      healthCheckDate,
      healthCheckDates,
      healthResults,
      lastSyncedAt,
      queryClient,
      showToast,
      userId,
    ],
  );

  const loadFromSecureStorage = useCallback(async () => {
    try {
      const [cancerData, healthData, cancerHist, healthHist] =
        await Promise.all([
          getCancerData(),
          getHealthData(),
          getAllHistory("cancer"),
          getAllHistory("health"),
        ]);

      // Load cancer data
      if (cancerData) {
        setNeverScreenedCancer(cancerData.neverScreened ?? false);
        if (cancerData.lastScreeningDate) {
          setCancerScreeningDate(new Date(cancerData.lastScreeningDate));
        }
        if (cancerData.testResults) {
          const parsedResults =
            typeof cancerData.testResults === "string"
              ? JSON.parse(cancerData.testResults)
              : cancerData.testResults;
          setTestResults(parsedResults || {});
        }
        if (cancerData.calculatedScreeningDates) {
          const screeningDates =
            typeof cancerData.calculatedScreeningDates === "string"
              ? JSON.parse(cancerData.calculatedScreeningDates)
              : cancerData.calculatedScreeningDates;
          setCancerScreeningDates(
            Array.isArray(screeningDates) ? screeningDates : [],
          );
        }
      }

      // Load health data
      if (healthData) {
        setNeverCheckedHealth(healthData.neverScreened ?? false);
        if (healthData.lastScreeningDate) {
          setHealthCheckDate(new Date(healthData.lastScreeningDate));
        }
        if (healthData.testResults) {
          const parsedResults =
            typeof healthData.testResults === "string"
              ? JSON.parse(healthData.testResults)
              : healthData.testResults;
          setHealthResults(parsedResults || {});
        }
        if (healthData.calculatedScreeningDates) {
          const screeningDates =
            typeof healthData.calculatedScreeningDates === "string"
              ? JSON.parse(healthData.calculatedScreeningDates)
              : healthData.calculatedScreeningDates;
          setHealthCheckDates(
            Array.isArray(screeningDates) ? screeningDates : [],
          );
        }
      }

      // Load history
      setCancerHistory(cancerHist || {});
      setHealthHistory(healthHist || {});

      return { cancerData, healthData };
    } catch (error) {
      console.error("Error loading from secure local storage:", error);
      showToast("Failed to load saved data", "error");
      return { cancerData: null, healthData: null };
    }
  }, [showToast]);

  const loadFromCloudSnapshots = useCallback(
    async (localData: { cancerData: any; healthData: any }) => {
      if (!userId) return;

      try {
        const [remoteCancerEntries, remoteHealthEntries] = await Promise.all([
          fetchUserCancerScreeningData(userId),
          fetchUserNutritionData(userId),
        ]);

        const remoteCancer = remoteCancerEntries?.[0];
        const remoteHealth = remoteHealthEntries?.[0];

        if (remoteCancer) {
          const remoteTimestamp = toTimestamp(
            remoteCancer.$updatedAt ||
              remoteCancer.updatedAt ||
              remoteCancer.$createdAt ||
              remoteCancer.createdAt,
          );
          const localTimestamp = toTimestamp(
            localData.cancerData?.lastModified,
          );
          const shouldUseRemote =
            !localData.cancerData || remoteTimestamp > localTimestamp;

          if (shouldUseRemote) {
            const remoteDates = parseJsonField<any[]>(
              remoteCancer.calculatedScreeningDates,
              [],
            );
            const remoteNeverRaw =
              remoteCancer.neverScreened ??
              remoteCancer.neverChecked ??
              remoteCancer.neverHadScreening;
            const remoteNever =
              typeof remoteNeverRaw === "boolean" ? remoteNeverRaw : undefined;
            const fallbackNever = Boolean(
              localData.cancerData?.neverScreened ?? neverScreenedCancer,
            );
            const mergedNever = remoteNever ?? fallbackNever;
            const remoteLastDate =
              typeof remoteCancer.lastScreeningDate === "string"
                ? remoteCancer.lastScreeningDate
                : undefined;
            const localLastDate =
              typeof localData.cancerData?.lastScreeningDate === "string"
                ? localData.cancerData.lastScreeningDate
                : undefined;
            const mergedLastDate = mergedNever
              ? undefined
              : remoteLastDate || localLastDate;
            const remoteResults = parseJsonField<
              Record<string, ScreeningResultRecord>
            >(remoteCancer.testResults, {});

            const normalizedCancerData: LocalStorageData = {
              age: Number(remoteCancer.age ?? age ?? 0),
              gender: normalizeGender(
                remoteCancer.gender,
                (user?.gender as Gender) || "male",
              ),
              neverScreened: mergedNever,
              lastScreeningDate: mergedLastDate,
              calculatedScreeningDates: Array.isArray(remoteDates)
                ? remoteDates
                : [],
              testResults:
                remoteResults && typeof remoteResults === "object"
                  ? remoteResults
                  : {},
              lastModified: new Date(
                remoteTimestamp || Date.now(),
              ).toISOString(),
            };

            setAge(normalizedCancerData.age || age);
            setGender(normalizedCancerData.gender);
            setNeverScreenedCancer(normalizedCancerData.neverScreened);
            setCancerScreeningDate(
              toDateOrUndefined(normalizedCancerData.lastScreeningDate),
            );
            setCancerScreeningDates(
              normalizedCancerData.calculatedScreeningDates,
            );
            setTestResults(normalizedCancerData.testResults);

            await storeCancerData(normalizedCancerData);
          }
        }

        if (remoteHealth) {
          const remoteTimestamp = toTimestamp(
            remoteHealth.$updatedAt ||
              remoteHealth.updatedAt ||
              remoteHealth.$createdAt ||
              remoteHealth.createdAt,
          );
          const localTimestamp = toTimestamp(
            localData.healthData?.lastModified,
          );
          const shouldUseRemote =
            !localData.healthData || remoteTimestamp > localTimestamp;

          if (shouldUseRemote) {
            const remoteDates = parseJsonField<any[]>(
              remoteHealth.checkupDates,
              [],
            );
            const remoteNeverRaw =
              remoteHealth.neverScreened ??
              remoteHealth.neverChecked ??
              remoteHealth.neverHadCheckup;
            const remoteNever =
              typeof remoteNeverRaw === "boolean" ? remoteNeverRaw : undefined;
            const fallbackNever = Boolean(
              localData.healthData?.neverScreened ?? neverCheckedHealth,
            );
            const mergedNever = remoteNever ?? fallbackNever;
            const remoteLastDate =
              typeof remoteHealth.lastCheckupDate === "string"
                ? remoteHealth.lastCheckupDate
                : undefined;
            const localLastDate =
              typeof localData.healthData?.lastScreeningDate === "string"
                ? localData.healthData.lastScreeningDate
                : undefined;
            const mergedLastDate = mergedNever
              ? undefined
              : remoteLastDate || localLastDate;
            const remoteResults = parseJsonField<
              Record<string, ScreeningResultRecord>
            >(remoteHealth.healthResults, {});

            const normalizedHealthData: LocalStorageData = {
              age: Number(remoteHealth.age ?? age ?? 0),
              gender: normalizeGender(
                remoteHealth.gender,
                (user?.gender as Gender) || "male",
              ),
              neverScreened: mergedNever,
              lastScreeningDate: mergedLastDate,
              calculatedScreeningDates: Array.isArray(remoteDates)
                ? remoteDates
                : [],
              testResults:
                remoteResults && typeof remoteResults === "object"
                  ? remoteResults
                  : {},
              lastModified: new Date(
                remoteTimestamp || Date.now(),
              ).toISOString(),
            };

            setAge(normalizedHealthData.age || age);
            setGender(normalizedHealthData.gender);
            setNeverCheckedHealth(normalizedHealthData.neverScreened);
            setHealthCheckDate(
              toDateOrUndefined(normalizedHealthData.lastScreeningDate),
            );
            setHealthCheckDates(normalizedHealthData.calculatedScreeningDates);
            setHealthResults(normalizedHealthData.testResults);

            await storeHealthData(normalizedHealthData);
          }
        }
      } catch (error) {
        console.error("Failed to hydrate screening snapshots from API:", error);
      }
    },
    [userId, age, user?.gender, neverScreenedCancer, neverCheckedHealth],
  );

  const fetchInitialData = useCallback(async () => {
    const now = Date.now();
    if (isInitialDataLoadingRef.current) return;
    if (now - lastInitialLoadAtRef.current < 1500) return;

    isInitialDataLoadingRef.current = true;
    setLoading(true);

    try {
      if (!user?.dob || !user?.gender) {
        router.push("/personal-details");
        showToast("Complete your profile to get accurate results.", "info");
        return;
      }

      const computedAge = computeAge(user?.dob);
      if (!computedAge) {
        showToast(
          "Invalid date of birth. Please update your profile.",
          "error",
        );
        router.push("/personal-details");
        return;
      }

      setAge(computedAge);
      setGender(normalizeGender(user?.gender, "male"));

      const localData = await loadFromSecureStorage();
      await loadFromCloudSnapshots(localData);
      const meta = await getScreeningSyncMeta();
      queryClient.setQueryData(
        queryKeys.screenings.overview(userId),
        await loadScreeningOverviewData(userId),
      );
      setLastSyncedAt(meta.lastSyncedAt || null);
      setHasUnsavedChanges(meta.hasPendingSync);
      setSyncState(
        meta.hasPendingSync
          ? meta.lastSyncError
            ? "failed"
            : "offline-pending"
          : meta.lastSyncedAt
            ? "synced"
            : "idle",
      );
      lastInitialLoadAtRef.current = Date.now();
    } catch (error: any) {
      console.error("Error in fetchInitialData:", error);
      showToast(error.message || "Failed to load data", "error");
    } finally {
      isInitialDataLoadingRef.current = false;
      setLoading(false);
    }
  }, [
    user,
    computeAge,
    loadFromSecureStorage,
    loadFromCloudSnapshots,
    queryClient,
    showToast,
    userId,
  ]);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  const handleCalculateCancer = useCallback(async () => {
    if (!age || isNaN(age)) {
      Alert.alert("Error", "Please enter a valid age.");
      return;
    }

    try {
      const newScreeningDates = buildCancerScreenings({
        age,
        gender: gender as Gender,
        testResults: testResults || {},
        neverScreened: neverScreenedCancer,
        lastScreeningDate: cancerScreeningDate?.toISOString(),
        existingItems: cancerScreeningDates,
      });

      const screeningArray = Array.isArray(newScreeningDates)
        ? newScreeningDates
        : [];
      setCancerScreeningDates(screeningArray);
      setHasUnsavedChanges(true);
      await saveToStorage(screeningArray, undefined);

      if (screeningArray.length > 0) {
        showToast("Cancer screenings calculated successfully!", "success");
      }
    } catch (error) {
      console.error("Error calculating cancer screenings:", error);
      showToast("Failed to calculate cancer screenings", "error");
    }
  }, [
    age,
    gender,
    testResults,
    neverScreenedCancer,
    cancerScreeningDate,
    cancerScreeningDates,
    saveToStorage,
    showToast,
  ]);

  const handleCalculateHealth = useCallback(async () => {
    if (!age || isNaN(age)) {
      Alert.alert("Error", "Please enter a valid age.");
      return;
    }

    try {
      const newHealthDates = buildHealthChecks({
        age,
        gender: gender as Gender,
        testResults: healthResults || {},
        neverScreened: neverCheckedHealth,
        lastScreeningDate: healthCheckDate?.toISOString(),
        existingItems: healthCheckDates,
      });

      const healthArray = Array.isArray(newHealthDates) ? newHealthDates : [];
      setHealthCheckDates(healthArray);
      setHasUnsavedChanges(true);
      await saveToStorage(undefined, healthArray);

      if (healthArray.length > 0) {
        showToast("Health checks calculated successfully!", "success");
      }
    } catch (error) {
      console.error("Error calculating health checks:", error);
      showToast("Failed to calculate health checks", "error");
    }
  }, [
    age,
    gender,
    healthResults,
    neverCheckedHealth,
    healthCheckDate,
    healthCheckDates,
    saveToStorage,
    showToast,
  ]);

  const handleScreeningTestResult = useCallback(
    async (
      screeningName: string,
      wasNormal: boolean,
      date: string,
      resultValue?: string,
    ) => {
      try {
        const newTestResults = { ...testResults };
        const result = wasNormal
          ? resultValue || "Normal"
          : BOOKING_REQUIRED_RESULT;

        newTestResults[screeningName] = {
          date: wasNormal ? date : new Date().toISOString(),
          result,
          bookingStatus: wasNormal ? undefined : "required",
          bookingUpdatedAt: wasNormal ? undefined : new Date().toISOString(),
        };
        setTestResults(newTestResults);

        await addHistoryEntry("cancer", screeningName, {
          date: wasNormal ? date : new Date().toISOString(),
          result,
          wasNormal,
          notes: resultValue ? `Result value: ${resultValue}` : undefined,
        });

        const updatedHistory = await getAllHistory("cancer");
        setCancerHistory(updatedHistory || {});

        if (age && gender) {
          const newScreeningDates = buildCancerScreenings({
            age,
            gender: gender as Gender,
            testResults: newTestResults,
            neverScreened: neverScreenedCancer,
            lastScreeningDate: cancerScreeningDate?.toISOString(),
            existingItems: cancerScreeningDates,
          });
          const screeningArray = (
            Array.isArray(newScreeningDates) ? newScreeningDates : []
          ).map((item) =>
            item.name === screeningName && !wasNormal
              ? { ...item, completed: false }
              : item,
          );
          setCancerScreeningDates(screeningArray);
          await saveToStorage(screeningArray, undefined, {
            cancerResults: newTestResults,
          });
        }

        setHasUnsavedChanges(true);
        showToast("Test result saved successfully!", "success");
      } catch (error) {
        console.error("Error saving test result:", error);
        showToast("Failed to save test result", "error");
      }
    },
    [
      testResults,
      age,
      gender,
      neverScreenedCancer,
      cancerScreeningDate,
      cancerScreeningDates,
      saveToStorage,
      showToast,
    ],
  );

  const handleHealthCheckResult = useCallback(
    async (
      checkName: string,
      wasNormal: boolean,
      date: string,
      resultValue?: string,
    ) => {
      try {
        const newHealthResults = { ...healthResults };
        const result = wasNormal
          ? resultValue || "Normal"
          : BOOKING_REQUIRED_RESULT;

        newHealthResults[checkName] = {
          date: wasNormal ? date : new Date().toISOString(),
          result,
          bookingStatus: wasNormal ? undefined : "required",
          bookingUpdatedAt: wasNormal ? undefined : new Date().toISOString(),
        };
        setHealthResults(newHealthResults);

        await addHistoryEntry("health", checkName, {
          date: wasNormal ? date : new Date().toISOString(),
          result,
          wasNormal,
          notes: resultValue ? `Result value: ${resultValue}` : undefined,
        });

        const updatedHistory = await getAllHistory("health");
        setHealthHistory(updatedHistory || {});

        if (age && gender) {
          const newHealthDates = buildHealthChecks({
            age,
            gender: gender as Gender,
            testResults: newHealthResults,
            neverScreened: neverCheckedHealth,
            lastScreeningDate: healthCheckDate?.toISOString(),
            existingItems: healthCheckDates,
          });
          const healthArray = (
            Array.isArray(newHealthDates) ? newHealthDates : []
          ).map((item) =>
            item.name === checkName && !wasNormal
              ? { ...item, completed: false }
              : item,
          );
          setHealthCheckDates(healthArray);
          await saveToStorage(undefined, healthArray, {
            healthResults: newHealthResults,
          });
        }

        setHasUnsavedChanges(true);
        showToast("Health check result saved successfully!", "success");
      } catch (error) {
        console.error("Error saving health check result:", error);
        showToast("Failed to save health check result", "error");
      }
    },
    [
      healthResults,
      age,
      gender,
      neverCheckedHealth,
      healthCheckDate,
      healthCheckDates,
      saveToStorage,
      showToast,
    ],
  );

  const toggleScreeningStatus = useCallback(
    async (index: number, type: "cancer" | "health") => {
      setRefreshing(true);
      try {
        if (type === "cancer") {
          const updatedDates = cancerScreeningDates.map((item, i) => {
            if (i === index) {
              return { ...item, completed: !item.completed };
            }
            return item;
          });
          setCancerScreeningDates(updatedDates);
          await saveToStorage(updatedDates, undefined);
        } else {
          const updatedDates = healthCheckDates.map((item, i) => {
            if (i === index) {
              return { ...item, completed: !item.completed };
            }
            return item;
          });
          setHealthCheckDates(updatedDates);
          await saveToStorage(undefined, updatedDates);
        }

        setHasUnsavedChanges(true);
        showToast("Status updated successfully!", "success");
      } catch (error: any) {
        console.error("Error in toggleScreeningStatus:", error);
        showToast("Failed to toggle screening status.", "error");
      } finally {
        setRefreshing(false);
      }
    },
    [cancerScreeningDates, healthCheckDates, saveToStorage, showToast],
  );

  const handleBookingStatusChange = useCallback(
    async (
      name: string,
      type: "cancer" | "health",
      status: BookingStatus,
      channel?: BookingChannel,
      details?: BookingStatusDetails,
    ) => {
      try {
        const timestamp = new Date().toISOString();
        if (type === "cancer") {
          const current = testResults[name];
          if (!current) return;

          const updatedResults = {
            ...testResults,
            [name]: {
              ...current,
              bookingStatus: status,
              bookingChannel: channel || current.bookingChannel,
              bookingUpdatedAt: timestamp,
              bookingConfirmedAt:
                status === "confirmed" ? timestamp : current.bookingConfirmedAt,
              appointmentAt: details?.appointmentAt || current.appointmentAt,
              bookedAt:
                details?.bookedAt ||
                (status === "confirmed" && !current.bookedAt
                  ? timestamp
                  : current.bookedAt),
              providerName: details?.providerName || current.providerName,
              notes: details?.notes || current.notes,
              result:
                status === "confirmed"
                  ? "Appointment booked"
                  : BOOKING_REQUIRED_RESULT,
            },
          };

          setTestResults(updatedResults);
          if (status !== "confirmed") {
            const updatedSchedule = cancerScreeningDates.map((item) =>
              item.name === name ? { ...item, completed: false } : item,
            );
            setCancerScreeningDates(updatedSchedule);
            await saveToStorage(updatedSchedule, undefined, {
              cancerResults: updatedResults,
            });
          } else {
            await saveToStorage(undefined, undefined, {
              cancerResults: updatedResults,
            });
          }
        } else {
          const current = healthResults[name];
          if (!current) return;

          const updatedResults = {
            ...healthResults,
            [name]: {
              ...current,
              bookingStatus: status,
              bookingChannel: channel || current.bookingChannel,
              bookingUpdatedAt: timestamp,
              bookingConfirmedAt:
                status === "confirmed" ? timestamp : current.bookingConfirmedAt,
              appointmentAt: details?.appointmentAt || current.appointmentAt,
              bookedAt:
                details?.bookedAt ||
                (status === "confirmed" && !current.bookedAt
                  ? timestamp
                  : current.bookedAt),
              providerName: details?.providerName || current.providerName,
              notes: details?.notes || current.notes,
              result:
                status === "confirmed"
                  ? "Appointment booked"
                  : BOOKING_REQUIRED_RESULT,
            },
          };

          setHealthResults(updatedResults);
          if (status !== "confirmed") {
            const updatedSchedule = healthCheckDates.map((item) =>
              item.name === name ? { ...item, completed: false } : item,
            );
            setHealthCheckDates(updatedSchedule);
            await saveToStorage(undefined, updatedSchedule, {
              healthResults: updatedResults,
            });
          } else {
            await saveToStorage(undefined, undefined, {
              healthResults: updatedResults,
            });
          }
        }

        setHasUnsavedChanges(true);
      } catch (error) {
        console.error("Failed to update booking status:", error);
        showToast("Failed to update booking status", "error");
      }
    },
    [
      cancerScreeningDates,
      healthCheckDates,
      healthResults,
      saveToStorage,
      showToast,
      testResults,
    ],
  );

  const handleBookingDeferred = useCallback(
    async (name: string, type: "cancer" | "health") => {
      try {
        if (type === "cancer") {
          const current = testResults[name];
          if (!current || current.bookingStatus !== "required") return;

          const updatedResults = { ...testResults };
          delete updatedResults[name];
          setTestResults(updatedResults);
          await saveToStorage(undefined, undefined, {
            cancerResults: updatedResults,
          });
        } else {
          const current = healthResults[name];
          if (!current || current.bookingStatus !== "required") return;

          const updatedResults = { ...healthResults };
          delete updatedResults[name];
          setHealthResults(updatedResults);
          await saveToStorage(undefined, undefined, {
            healthResults: updatedResults,
          });
        }

        setHasUnsavedChanges(true);
      } catch (error) {
        console.error("Failed to defer booking flow:", error);
        showToast("Failed to dismiss booking prompt", "error");
      }
    },
    [healthResults, saveToStorage, showToast, testResults],
  );

  const isLikelyOfflineError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();
    return (
      message.includes("network request failed") ||
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("failed to fetch")
    );
  };

  const parseStoredJsonValue = <T,>(
    value: string | T | null | undefined,
    fallback: T,
  ): T => {
    if (value === null || value === undefined) return fallback;
    if (typeof value !== "string") return value;

    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };

  const performCloudSync = useCallback(
    async ({
      withReminders,
      silent = false,
    }: {
      withReminders: boolean;
      silent?: boolean;
    }) => {
      if (!userId) {
        throw new Error("User information is missing");
      }

      setSyncState("syncing");
      await saveToStorage();

      const [localCancerData, localHealthData] = await Promise.all([
        getCancerData(),
        getHealthData(),
      ]);

      const savePromises = [];

      if (localCancerData && cancerScreeningDates.length > 0) {
        const normalizedCancerDates = parseStoredJsonValue<any[]>(
          localCancerData.calculatedScreeningDates,
          [],
        );
        const normalizedCancerResults = parseStoredJsonValue<
          Record<string, unknown>
        >(localCancerData.testResults, {});
        const cancerPayload = {
          age: localCancerData.age,
          gender: localCancerData.gender,
          calculatedScreeningDates: normalizedCancerDates,
          testResults: normalizedCancerResults,
          lastScreeningDate: localCancerData.lastScreeningDate,
          userId,
        };
        savePromises.push(saveCancerScreeningData(cancerPayload));
      }

      if (localHealthData && healthCheckDates.length > 0) {
        const normalizedHealthDates = parseStoredJsonValue<any[]>(
          localHealthData.calculatedScreeningDates,
          [],
        );
        const normalizedHealthResults = parseStoredJsonValue<
          Record<string, unknown>
        >(localHealthData.testResults, {});
        const healthPayload = {
          checkupDates: normalizedHealthDates,
          healthResults: normalizedHealthResults,
          lastCheckupDate: localHealthData.lastScreeningDate,
          age: localHealthData.age,
          gender: localHealthData.gender,
          userId,
        };
        savePromises.push(saveNutritionData(healthPayload));
      }

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      if (withReminders) {
        const allEvents = [
          ...cancerScreeningDates.filter((item) => item.eligible),
          ...healthCheckDates.filter((item) => item.eligible),
        ].map((item) => ({
          title: item.name,
          date: convertDateFormat(item.date),
          description: `Your ${item.name} is scheduled for ${formatDate(
            item.date,
          )}. Remember to attend for timely health checks.`,
        }));

        const allNotifications = [
          ...cancerScreeningDates.filter((item) => item.eligible),
          ...healthCheckDates.filter((item) => item.eligible),
        ].flatMap((item) => {
          try {
            const formattedDate = convertDateFormat(item.date);
            const screeningDate = new Date(formattedDate);
            if (isNaN(screeningDate.getTime())) {
              throw new Error("Invalid date");
            }

            const oneMonthBefore = new Date(screeningDate);
            oneMonthBefore.setMonth(screeningDate.getMonth() - 1);

            return [
              {
                date: oneMonthBefore.toISOString(),
                title: `Upcoming Screening: ${item.name}`,
                body: `Don't forget! Your ${item.name} is scheduled for ${formattedDate}. Early detection is key to staying healthy.`,
              },
              {
                date: formattedDate,
                title: item.name,
                body: `Your ${item.name} is scheduled for this month. Please ensure you attend to keep your health in check.`,
              },
            ];
          } catch (error) {
            console.error("Error processing notification date:", error);
            return [];
          }
        });

        if (allEvents.length > 0) {
          await addDatesToCalendar(allEvents);
        }

        if (allNotifications.length > 0) {
          const eventsTitles = [
            ...cancerScreeningDates.filter((item) => item.eligible),
            ...healthCheckDates.filter((item) => item.eligible),
          ].map((item) => item.name);

          const existingNotificationIdentifiers =
            await getNotificationIdentifiersByTitles(eventsTitles);
          if (existingNotificationIdentifiers.length > 0) {
            await cancelSelectedNotifications(existingNotificationIdentifiers);
          }

          await scheduleNotifications(allNotifications);
        }
      }

      const syncedAt = new Date().toISOString();
      setLastSyncedAt(syncedAt);
      setHasUnsavedChanges(false);
      setSyncState("synced");
      await setScreeningSyncMeta({
        hasPendingSync: false,
        lastSyncedAt: syncedAt,
        lastSyncError: null,
      });
      queryClient.setQueryData(
        queryKeys.screenings.overview(userId),
        buildScreeningOverviewData({
          cancerData: localCancerData,
          healthData: localHealthData,
          syncMeta: {
            hasPendingSync: false,
            lastSyncedAt: syncedAt,
            lastSyncError: null,
          },
        }),
      );

      if (!silent) {
        showToast(
          withReminders
            ? "Data synced to cloud successfully!"
            : "Data auto-synced.",
          "success",
        );
      }
    },
    [
      cancerScreeningDates,
      healthCheckDates,
      queryClient,
      saveToStorage,
      showToast,
      userId,
    ],
  );

  const handleSave = useCallback(async () => {
    setIsUploading(true);

    try {
      await performCloudSync({ withReminders: true });
    } catch (error: any) {
      console.error("Sync error:", error);
      setSyncState(isLikelyOfflineError(error) ? "offline-pending" : "failed");
      await setScreeningSyncMeta({
        hasPendingSync: true,
        lastSyncError: error?.message || "Sync failed",
      });
      showToast("Sync failed. Data saved locally.", "error");
    } finally {
      setIsUploading(false);
    }
  }, [performCloudSync, showToast]);

  useEffect(() => {
    if (!hasUnsavedChanges || !userId) return;
    if (isUploading || isAutoSyncingRef.current) return;

    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }

    autoSyncTimeoutRef.current = setTimeout(async () => {
      isAutoSyncingRef.current = true;
      try {
        await performCloudSync({ withReminders: false, silent: true });
      } catch (error: any) {
        const pendingState = isLikelyOfflineError(error)
          ? "offline-pending"
          : "failed";
        setSyncState(pendingState);
        await setScreeningSyncMeta({
          hasPendingSync: true,
          lastSyncError: error?.message || "Auto-sync failed",
        });
      } finally {
        isAutoSyncingRef.current = false;
      }
    }, 1800);

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, isUploading, performCloudSync, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasUnsavedChanges || isUploading || isAutoSyncingRef.current) return;
      performCloudSync({ withReminders: false, silent: true }).catch(
        async (error: any) => {
          const pendingState = isLikelyOfflineError(error)
            ? "offline-pending"
            : "failed";
          setSyncState(pendingState);
          await setScreeningSyncMeta({
            hasPendingSync: true,
            lastSyncError: error?.message || "Retry sync failed",
          });
        },
      );
    }, [hasUnsavedChanges, isUploading, performCloudSync]),
  );

  const handleClear = useCallback(() => {
    Alert.alert(
      "Clear Data",
      "Are you sure you want to clear all data including history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await clearAllData();

              if (userId) {
                await Promise.all([
                  deleteCancerScreeningData(userId).catch(console.log),
                  deleteNutritionData(userId).catch(console.log),
                ]);
              }

              // Reset all state
              setNeverScreenedCancer(false);
              setCancerScreeningDate(undefined);
              setCancerScreeningDates([]);
              setTestResults({});
              setNeverCheckedHealth(false);
              setHealthCheckDate(undefined);
              setHealthCheckDates([]);
              setHealthResults({});
              setCancerHistory({});
              setHealthHistory({});
              setHasUnsavedChanges(false);
              setSyncState("idle");
              setLastSyncedAt(null);
              queryClient.setQueryData(
                queryKeys.screenings.overview(userId),
                buildScreeningOverviewData({
                  cancerData: null,
                  healthData: null,
                  syncMeta: {
                    hasPendingSync: false,
                    lastSyncedAt: null,
                    lastSyncError: null,
                  },
                  status: "empty",
                }),
              );

              const computedAge = computeAge(user?.dob ?? undefined);
              setAge(computedAge);
              setGender(normalizeGender(user?.gender, "male"));

              showToast(
                "All data and history cleared successfully.",
                "success",
              );
            } catch (error) {
              console.error("Error clearing data:", error);
              showToast("Failed to clear data. Please try again.", "error");
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [userId, user, computeAge, queryClient, showToast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
  }, [fetchInitialData]);

  useEffect(() => {
    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, []);

  // Memoized components for better performance
  const cancerForm = useMemo(
    () => (
      <CancerScreeningForm
        neverScreenedCancer={neverScreenedCancer}
        setNeverScreenedCancer={async (value) => {
          setNeverScreenedCancer(value);
          if (value) {
            setCancerScreeningDate(undefined);
          }
          setHasUnsavedChanges(true);
          await saveToStorage(undefined, undefined, {
            neverScreenedCancer: value,
            cancerScreeningDate: value ? undefined : cancerScreeningDate,
          });
        }}
        cancerScreeningDate={cancerScreeningDate}
        setCancerScreeningDate={async (date) => {
          setCancerScreeningDate(date);
          setHasUnsavedChanges(true);
          await saveToStorage(undefined, undefined, {
            cancerScreeningDate: date,
          });
        }}
        cancerScreeningDates={cancerScreeningDates}
        handleCalculateCancer={handleCalculateCancer}
        age={age}
        gender={gender as Gender}
        onTestResultSubmit={handleScreeningTestResult}
        onBookingStatusChange={handleBookingStatusChange}
        onBookingDeferred={handleBookingDeferred}
        testResults={testResults}
        history={cancerHistory}
      />
    ),
    [
      neverScreenedCancer,
      cancerScreeningDate,
      cancerScreeningDates,
      handleCalculateCancer,
      age,
      gender,
      handleScreeningTestResult,
      handleBookingStatusChange,
      handleBookingDeferred,
      testResults,
      cancerHistory,
      saveToStorage,
    ],
  );

  const healthForm = useMemo(
    () => (
      <>
        <HealthCheckForm
          neverCheckedHealth={neverCheckedHealth}
          setNeverCheckedHealth={async (value) => {
            setNeverCheckedHealth(value);
            if (value) {
              setHealthCheckDate(undefined);
            }
            setHasUnsavedChanges(true);
            await saveToStorage(undefined, undefined, {
              neverCheckedHealth: value,
              healthCheckDate: value ? undefined : healthCheckDate,
            });
          }}
          healthCheckDate={healthCheckDate}
          setHealthCheckDate={async (date) => {
            setHealthCheckDate(date);
            setHasUnsavedChanges(true);
            await saveToStorage(undefined, undefined, {
              healthCheckDate: date,
            });
          }}
          healthCheckDates={healthCheckDates}
          handleCalculateHealth={handleCalculateHealth}
          age={age}
          gender={gender as Gender}
          onTestResultSubmit={handleHealthCheckResult}
          onBookingStatusChange={handleBookingStatusChange}
          onBookingDeferred={handleBookingDeferred}
          healthResults={healthResults}
          history={healthHistory}
        />
      </>
    ),
    [
      neverCheckedHealth,
      healthCheckDate,
      healthCheckDates,
      handleCalculateHealth,
      age,
      gender,
      handleHealthCheckResult,
      handleBookingStatusChange,
      handleBookingDeferred,
      healthResults,
      healthHistory,
      saveToStorage,
    ],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-white">
        <ScreeningTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        <ScrollView
          className="flex-1"
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: getSpacing(16),
          }}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00CED1"
              colors={["#00CED1"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === "cancer" ? (
            <>
              {cancerForm}
              {cancerScreeningDates.length > 0 && (
                <ScreeningSchedule
                  items={cancerScreeningDates}
                  type="cancer"
                  title="Cancer Screening Schedule"
                  toggleScreeningStatus={toggleScreeningStatus}
                  onUploadDocument={(name) => docUpload.open(name)}
                  onBookingStatusChange={handleBookingStatusChange}
                  testResults={testResults}
                  history={cancerHistory}
                />
              )}
            </>
          ) : (
            <>
              {healthForm}
              {healthCheckDates.length > 0 && (
                <ScreeningSchedule
                  items={healthCheckDates}
                  type="health"
                  title="Health Check Schedule"
                  toggleScreeningStatus={toggleScreeningStatus}
                  onUploadDocument={(name) => docUpload.open(name)}
                  onBookingStatusChange={handleBookingStatusChange}
                  healthResults={healthResults}
                  history={healthHistory}
                />
              )}
            </>
          )}

          {(cancerScreeningDates.length > 0 || healthCheckDates.length > 0) && (
            <ScreeningActions
              isUploading={isUploading}
              handleSave={handleSave}
              handleClear={handleClear}
              hasUnsavedChanges={hasUnsavedChanges}
              syncState={syncState}
              lastSyncedAt={lastSyncedAt}
            />
          )}
        </ScrollView>
      </SafeAreaView>
      <UploadModal
        visible={docUpload.visible}
        onClose={docUpload.close}
        form={docUpload.form}
        setForm={docUpload.setForm as any}
        uploading={docUpload.uploading}
        onSubmit={docUpload.submit}
        onUploadDocument={docUpload.pickDocument}
      />
      <LoadingSpinner visible={loading || isUploading} />
    </GestureHandlerRootView>
  );
};

export default HealthScreeningPage;
