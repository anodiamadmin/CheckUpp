import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DatePicker } from "@/components/common/DatePicker";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  format,
  addWeeks,
  differenceInWeeks,
  differenceInDays,
} from "date-fns";
import { convertDateFormat, formatDate } from "@/lib/utils/dateFormatConverter";
import LoadingSpinner from "@/components/LoadingSpinner";
import PregnancyTip from "@/components/PregnancyTips";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import {
  useDeletePregnancyPlanMutation,
  useMarkPregnancyCheckupCompletedMutation,
  useSavePregnancyPlanMutation,
} from "@/lib/features/pregnancy/mutations";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useToast } from "@/components/ToastProvider";
import {
  addDatesToCalendar,
  removeEventsFromCalendar,
} from "@/lib/notifications/calendar";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { cancelSelectedNotifications } from "@/lib/notifications/cancelAllNotifications";
import { getNotificationIdentifiersByTitles } from "@/lib/notifications/getNotifications";
import UploadModal from "@/components/UploadModal";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { usePregnancyPlan } from "@/lib/features/pregnancy/queries";
import { PregnancyPlanSnapshot } from "@/lib/features/pregnancy/types";
import useScreenEntrance from "@/lib/animation/useScreenEntrance";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

// Responsive spacing
const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const extraPadding = getSpacing(24);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

const CHECKUP_CATEGORIES = [
  {
    key: "blood_tests",
    label: "Blood Tests",
    icon: "test-tube" as const,
    color: "#8B5CF6",
  },
  {
    key: "ultrasounds",
    label: "Ultrasounds",
    icon: "monitor-dashboard" as const,
    color: "#06B6D4",
  },
  {
    key: "vaccinations",
    label: "Vaccinations",
    icon: "needle" as const,
    color: "#F472B6",
  },
  {
    key: "appointments",
    label: "Appointments & Planning",
    icon: "hospital-box" as const,
    color: "#F59E42",
  },
  {
    key: "postnatal",
    label: "Postnatal",
    icon: "baby-carriage" as const,
    color: "#0EA5E9",
  },
];

const CHECKUP_META = [
  {
    name: "Book First Hospital Appointment",
    week: 4,
    icon: "hospital-box",
    color: "#F59E42",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    category: "appointments",
  },
  {
    name: "Non-Invasive Prenatal Testing (NIPT)",
    week: 10,
    icon: "dna",
    color: "#A3E635",
    bgColor: "bg-lime-50",
    borderColor: "border-lime-200",
    textColor: "text-lime-700",
    category: "blood_tests",
    hasDocument: true,
  },
  {
    name: "Routine Blood & Urine Tests",
    week: 10,
    icon: "water-plus",
    color: "#06B6D4",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    category: "blood_tests",
    hasDocument: true,
  },
  {
    name: "First Trimester Screening (cFTS)",
    week: 12,
    icon: "test-tube",
    color: "#8B5CF6",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    category: "blood_tests",
    hasDocument: true,
  },
  {
    name: "Influenza Vaccination",
    week: 14,
    icon: "needle",
    color: "#F472B6",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    textColor: "text-pink-700",
    category: "vaccinations",
  },
  {
    name: "Morphology Ultrasound",
    week: 20,
    icon: "baby-face-outline",
    color: "#06B6D4",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    category: "ultrasounds",
    hasDocument: true,
  },
  {
    name: "Pertussis (Whooping Cough) Vaccination",
    week: 28,
    icon: "needle",
    color: "#A78BFA",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    textColor: "text-violet-700",
    category: "vaccinations",
  },
  {
    name: "Gestational Diabetes Screening",
    week: 26,
    icon: "water-outline",
    color: "#F59E0B",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    category: "blood_tests",
    hasDocument: true,
  },
  {
    name: "Group B Streptococcus (GBS) Swab",
    week: 36,
    icon: "bacteria",
    color: "#34D399",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    category: "blood_tests",
    hasDocument: true,
  },
  {
    name: "Third Trimester Ultrasound",
    week: 37,
    icon: "monitor-dashboard",
    color: "#EF4444",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    category: "ultrasounds",
    hasDocument: true,
  },
  {
    name: "Birth Plan Discussion",
    week: 37,
    icon: "account-tie",
    color: "#F59E42",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    textColor: "text-orange-700",
    category: "appointments",
  },
  {
    name: "Book Parent Education Classes / Hospital Tour",
    week: 24,
    icon: "school",
    color: "#FBBF24",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    category: "appointments",
  },
  {
    name: "Postnatal: Newborn Check (2 weeks)",
    week: 42,
    icon: "baby-carriage",
    color: "#0EA5E9",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-700",
    category: "postnatal",
  },
  {
    name: "Postnatal: Maternal Check (6 weeks)",
    week: 46,
    icon: "account-heart",
    color: "#A7F3D0",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-700",
    category: "postnatal",
  },
];

const getCategoryInfo = (categoryKey: string) =>
  CHECKUP_CATEGORIES.find((cat) => cat.key === categoryKey);

const mergeCheckupMeta = (checkupList: any) => {
  return checkupList.map((item: any) => {
    const meta = CHECKUP_META.find((c) => c.name === item.name);
    return {
      ...item,
      ...(meta || {}),
    };
  });
};

const calculateCheckupDates = (dueDate: Date) => {
  const lmpDate = addWeeks(dueDate, -40);

  return CHECKUP_META.map((item) => ({
    ...item,
    date: format(addWeeks(lmpDate, item.week), "MMMM do, yyyy"),
    completed: false,
  }));
};

const toValidDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const PregnancyPlanner = () => {
  const [lmpDate, setLmpDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [checkupDates, setCheckupDates] = useState<
    {
      name: string;
      date: string;
      completed: boolean;
      icon?: string;
      color?: string;
      bgColor?: string;
      borderColor?: string;
      textColor?: string;
    }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useScreenEntrance();
  const [scrollY] = useState(new Animated.Value(0));

  const [isCalculating, setIsCalculating] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calculateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isHydratingRef = useRef(false);
  const hasUserChangesRef = useRef(false);
  const hasHydratedInitialPlanRef = useRef(false);

  const { userId } = useGlobalContext();
  const { showToast } = useToast();
  const {
    data: pregnancyPlan,
    refetch: refetchPregnancyPlan,
    loading: pregnancyPlanLoading,
  } = usePregnancyPlan(userId);
  const savePregnancyPlan = useSavePregnancyPlanMutation(userId);
  const markPregnancyCheckupCompleted =
    useMarkPregnancyCheckupCompletedMutation(userId);
  const deletePregnancyPlan = useDeletePregnancyPlanMutation(userId);

  const applyPregnancyPlan = useCallback(
    (plan: PregnancyPlanSnapshot | null) => {
      const parsedLmp = toValidDate(plan?.conceptionDate);
      const parsedDueDate = toValidDate(plan?.expectedDueDate);
      const loaded = mergeCheckupMeta(plan?.estimatedCheckupDates || []);

      setLmpDate(parsedLmp);
      setDueDate(parsedDueDate);
      setCheckupDates(loaded);
      setHasCalculated(loaded.length > 0);

      if ((!parsedLmp || !parsedDueDate) && loaded.length > 0) {
        showToast(
          "Some saved pregnancy dates were invalid and could not be loaded.",
          "info",
        );
      }
    },
    [showToast],
  );

  const persistPlannerSnapshot = useCallback(async () => {
    if (!userId || !lmpDate || !dueDate || !hasCalculated) return;

    await savePregnancyPlan.mutateAsync({
      conceptionDate: lmpDate,
      expectedDueDate: dueDate,
      estimatedCheckupDates: checkupDates,
    });
  }, [
    checkupDates,
    dueDate,
    hasCalculated,
    lmpDate,
    savePregnancyPlan,
    userId,
  ]);

  // Header animations
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.98],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (!userId || pregnancyPlanLoading || hasHydratedInitialPlanRef.current) {
      return;
    }

    isHydratingRef.current = true;
    applyPregnancyPlan(pregnancyPlan ?? null);
    hasHydratedInitialPlanRef.current = true;
    isHydratingRef.current = false;
  }, [applyPregnancyPlan, pregnancyPlan, pregnancyPlanLoading, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    isHydratingRef.current = true;
    try {
      const refreshed = await refetchPregnancyPlan();
      applyPregnancyPlan(refreshed.data ?? null);
    } catch (error) {
      console.error("Error refreshing pregnancy data:", error);
      showToast("Failed to refresh pregnancy planner data.", "error");
    } finally {
      isHydratingRef.current = false;
      setRefreshing(false);
    }
  };

  const handleDateChange = (selectedDate: Date) => {
    hasUserChangesRef.current = true;
    setLmpDate(selectedDate);
    const calculatedDueDate = addWeeks(selectedDate, 40);
    setDueDate(calculatedDueDate);
    setHasCalculated(false);
    setCheckupDates([]);
  };

  const handleCalculate = async () => {
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      showToast("Please pick a valid date.", "info");
      return;
    }
    setIsCalculating(true);
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }

    calculateTimeoutRef.current = setTimeout(() => {
      const calculatedDates = calculateCheckupDates(dueDate);
      hasUserChangesRef.current = true;
      setCheckupDates(calculatedDates);
      setHasCalculated(true);
      setIsCalculating(false);
    }, 1000);
  };

  // Calculate gestational age
  const hasValidLmpDate = Boolean(lmpDate && !Number.isNaN(lmpDate.getTime()));
  const safeLmpDate = hasValidLmpDate ? lmpDate! : undefined;
  const gestationalWeeks = hasValidLmpDate
    ? differenceInWeeks(new Date(), lmpDate!)
    : undefined;
  const gestationalDays = hasValidLmpDate
    ? differenceInDays(new Date(), lmpDate!)
    : undefined;

  const toggleCheckupStatus = async (index: number) => {
    if (!checkupDates[index]) return;

    hasUserChangesRef.current = true;
    const updatedCheckupDates = checkupDates.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item,
    );

    setCheckupDates(updatedCheckupDates);

    if (userId) {
      try {
        const checkupName = updatedCheckupDates[index].name;
        if (updatedCheckupDates[index].completed) {
          await markPregnancyCheckupCompleted.mutateAsync(checkupName);
        } else {
          await persistPlannerSnapshot();
        }
        showToast("Checkup status updated!", "success");
      } catch (error) {
        console.error("Error updating checkup status:", error);
        showToast("Failed to update checkup status.", "error");
      }
    }
  };

  useEffect(() => {
    if (!hasUserChangesRef.current) return;
    if (isHydratingRef.current) return;
    if (!userId || !lmpDate || !dueDate || !hasCalculated) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsAutoSaving(true);
      setAutoSaveError(null);
      try {
        await persistPlannerSnapshot();
      } catch (error: any) {
        setAutoSaveError(error?.message || "Auto-save failed");
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    userId,
    lmpDate,
    dueDate,
    checkupDates,
    hasCalculated,
    persistPlannerSnapshot,
  ]);

  useEffect(() => {
    return () => {
      if (calculateTimeoutRef.current) {
        clearTimeout(calculateTimeoutRef.current);
      }
    };
  }, []);

  const docUpload = useDocumentUpload({ userId, showToast });

  const handleSave = async () => {
    if (
      !lmpDate ||
      !dueDate ||
      Number.isNaN(lmpDate.getTime()) ||
      Number.isNaN(dueDate.getTime())
    ) {
      showToast("Please complete the form before saving.", "error");
      return;
    }

    setIsUploading(true);

    try {
      await savePregnancyPlan.mutateAsync({
        conceptionDate: lmpDate,
        expectedDueDate: dueDate,
        estimatedCheckupDates: checkupDates,
      });

      // Only use incomplete checkups for scheduling!
      const incompleteCheckups = checkupDates.filter((item) => !item.completed);

      // Remove old calendar events/notifications by title
      const eventTitles = incompleteCheckups.map((item) => item.name);

      // Remove old events (by title)
      if (eventTitles.length > 0) {
        await removeEventsFromCalendar(eventTitles).catch(() => {});
      }

      // Remove old notifications
      const existingNotificationIds = await getNotificationIdentifiersByTitles(
        eventTitles,
      ).catch(() => []);
      if (existingNotificationIds && existingNotificationIds.length > 0) {
        await cancelSelectedNotifications(existingNotificationIds).catch(
          () => {},
        );
      }

      // Schedule calendar events
      if (incompleteCheckups.length > 0) {
        const calendarEvents = incompleteCheckups.map((item) => ({
          title: item.name,
          date: convertDateFormat(item.date),
          description: `Your ${item.name} is scheduled for ${formatDate(
            item.date,
          )}.`,
        }));
        await addDatesToCalendar(calendarEvents).catch(() => {});
      }

      // Schedule notifications
      if (incompleteCheckups.length > 0) {
        const notifications = incompleteCheckups.flatMap((item) => {
          try {
            const isoDate = convertDateFormat(item.date);
            const eventDate = new Date(isoDate);

            if (isNaN(eventDate.getTime())) return [];

            const oneWeekBefore = new Date(eventDate);
            oneWeekBefore.setDate(eventDate.getDate() - 7);

            return [
              {
                date: oneWeekBefore.toISOString(),
                title: `Upcoming Checkup: ${item.name}`,
                body: `Your ${item.name} is coming up on ${formatDate(
                  item.date,
                )}. Prepare accordingly.`,
              },
              {
                date: isoDate,
                title: item.name,
                body: `It's time for your ${item.name} today!`,
              },
            ];
          } catch {
            return [];
          }
        });

        if (notifications.length > 0) {
          await scheduleNotifications(notifications).catch(() => {});
        }
      }

      showToast(
        "Pregnancy planner data has been saved and reminders set!",
        "success",
      );
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("Failed to save data.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = () => {
    // Confirm clear with Alert, but use toast for feedback
    Alert.alert(
      "Clear Pregnancy Data",
      "Are you sure you want to clear all pregnancy data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Remove all events/notifications (both completed and incomplete checkups)
              const allTitles = checkupDates.map((item) => item.name);

              if (allTitles.length > 0) {
                await removeEventsFromCalendar(allTitles).catch(() => {});
                const notificationIds =
                  await getNotificationIdentifiersByTitles(allTitles).catch(
                    () => [],
                  );
                if (notificationIds && notificationIds.length > 0) {
                  await cancelSelectedNotifications(notificationIds).catch(
                    () => {},
                  );
                }
              }

              if (userId) {
                await deletePregnancyPlan.mutateAsync();
              }

              // Clear local state
              setLmpDate(undefined);
              setDueDate(undefined);
              setCheckupDates([]);
              setHasCalculated(false);
              hasUserChangesRef.current = false;

              showToast("Pregnancy data and reminders cleared.", "success");
            } catch (error) {
              console.error("Error deleting data:", error);
              showToast("Failed to clear data.", "error");
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF9C01"
              colors={["#FF9C01"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
        >
          {/* Compact Header */}
          <Animated.View
            style={[
              {
                transform: [
                  { translateY: headerTranslateY },
                  { scale: headerScale },
                ],
              },
              {
                paddingHorizontal: scale(16),
                paddingTop: getSpacing(8),
                paddingBottom: getSpacing(4),
              },
            ]}
          >
            <View
              className="bg-white rounded-xl border border-gray-100"
              style={{
                paddingHorizontal: scale(16),
                paddingVertical: getSpacing(16),
                marginBottom: getSpacing(12),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 items-center">
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(4) }}
                  >
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(6),
                        marginRight: scale(8),
                        backgroundColor: "#FF9C0115",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="baby-face-outline"
                        size={scale(20)}
                        color="#FF9C01"
                      />
                    </View>
                    <Text
                      className="text-black font-psemibold"
                      style={{ fontSize: getFontSize(18) }}
                    >
                      Pregnancy Planner
                    </Text>
                  </View>
                  <Text
                    className="text-gray-500 font-pregular text-center"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Keep track of your journey to motherhood
                  </Text>
                  {hasCalculated && (
                    <Text
                      className="font-pregular text-center"
                      style={{
                        fontSize: getFontSize(10),
                        marginTop: getSpacing(4),
                        color: autoSaveError ? "#DC2626" : "#6B7280",
                      }}
                    >
                      {isAutoSaving
                        ? "Auto-saving changes..."
                        : autoSaveError
                          ? `Auto-save failed: ${autoSaveError}`
                          : "Auto-save enabled"}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* LMP Section */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginHorizontal: scale(12),
              marginBottom: getSpacing(16),
            }}
          >
            <View
              className="bg-white rounded-xl border border-gray-100"
              style={{
                padding: scale(16),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(12) }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(8),
                    marginRight: scale(10),
                    backgroundColor: "#FF9C0115",
                  }}
                >
                  <MaterialCommunityIcons
                    name="calendar-plus"
                    size={scale(18)}
                    color="#FF9C01"
                  />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{ fontSize: getFontSize(16) }}
                >
                  Last Menstrual Period (LMP)
                </Text>
              </View>

              <Text
                className="text-gray-600 font-pregular"
                style={{
                  fontSize: getFontSize(12),
                  marginBottom: getSpacing(16),
                  lineHeight: getFontSize(16),
                }}
              >
                Select the first day of your last menstrual period to calculate
                your estimated due date and important checkup dates.
              </Text>

              <DatePicker
                label=""
                value={safeLmpDate ?? new Date()}
                onDateChange={handleDateChange}
                placeholder="Select your LMP date"
                title="Last Menstrual Period"
                subtitle="Select Your"
                maxDate={new Date()}
                dateFormat={(date: Date) => format(date, "MMMM do, yyyy")}
              />
            </View>
          </Animated.View>

          {/* Pregnancy Status Card */}
          {hasValidLmpDate && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(16),
              }}
            >
              <View
                className="bg-white rounded-xl border border-gray-100"
                style={{
                  padding: scale(16),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  className="flex-row items-center"
                  style={{ marginBottom: getSpacing(12) }}
                >
                  <View
                    className="rounded-lg"
                    style={{
                      padding: scale(8),
                      marginRight: scale(10),
                      backgroundColor: "#10B98115",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="baby"
                      size={scale(18)}
                      color="#10B981"
                    />
                  </View>
                  <Text
                    className="font-psemibold text-black"
                    style={{ fontSize: getFontSize(16) }}
                  >
                    Pregnancy Status
                  </Text>
                </View>

                <View style={{ gap: getSpacing(8) }}>
                  <View
                    className="flex-row items-center justify-between bg-gray-50 rounded-lg"
                    style={{ padding: scale(12) }}
                  >
                    <Text
                      className="text-gray-600 font-pmedium"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      Expected Due Date:
                    </Text>
                    <Text
                      className="text-black font-psemibold"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {dueDate
                        ? format(dueDate, "MMM do, yyyy")
                        : "Calculating..."}
                    </Text>
                  </View>

                  <View
                    className="flex-row items-center justify-between bg-gray-50 rounded-lg"
                    style={{ padding: scale(12) }}
                  >
                    <Text
                      className="text-gray-600 font-pmedium"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      Current Stage:
                    </Text>
                    <Text
                      className="text-black font-psemibold"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {gestationalWeeks} weeks ({gestationalDays} days)
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Pregnancy Tip */}
          {gestationalWeeks !== undefined && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(12),
                marginBottom: getSpacing(16),
              }}
            >
              <PregnancyTip gestationalWeeks={gestationalWeeks} />
            </Animated.View>
          )}

          {hasCalculated && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(12),
              }}
            >
              <View
                className="bg-white border border-gray-100 rounded-lg"
                style={{
                  padding: scale(14),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-start">
                  <View
                    className="rounded-lg"
                    style={{
                      padding: scale(6),
                      marginRight: scale(10),
                      backgroundColor: "#FBBF2415",
                    }}
                  >
                    <Ionicons
                      name="information-circle"
                      size={scale(16)}
                      color="#FBBF24"
                    />
                  </View>
                  <Text
                    className="font-pregular text-gray-600 flex-1"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    <Text className="font-psemibold text-black">Note:</Text>{" "}
                    This is intended as a guide only developed by the
                    SLHD/CESPHN ANSC GP Program.
                    {"\n"}
                    You may wish to discuss additional information with your
                    GP/health professional.
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Calculate Button (hidden after calculation, or if already calculated) */}
          {!hasCalculated && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(16),
              }}
            >
              <TouchableOpacity
                onPress={handleCalculate}
                className="bg-secondary rounded-lg"
                style={{
                  paddingVertical: getSpacing(12),
                  shadowColor: "#FF9C01",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                  opacity: isCalculating ? 0.7 : 1,
                }}
                activeOpacity={0.7}
                disabled={isCalculating}
              >
                <View className="flex-row items-center justify-center">
                  {isCalculating ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <MaterialCommunityIcons
                      name="calculator"
                      size={scale(16)}
                      color="#000"
                    />
                  )}
                  <Text
                    className="text-black font-psemibold ml-2"
                    style={{ fontSize: getFontSize(14) }}
                  >
                    {isCalculating
                      ? "Calculating..."
                      : "Calculate Checkup Dates"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* View My Prenatal Checklist Button */}
          {checkupDates.length > 0 && !showChecklist && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(16),
              }}
            >
              <TouchableOpacity
                onPress={() => setShowChecklist(true)}
                className="bg-secondary rounded-lg"
                style={{
                  paddingVertical: getSpacing(14),
                  shadowColor: "#FF9C01",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons
                    name="clipboard-check-outline"
                    size={scale(18)}
                    color="#000"
                  />
                  <Text
                    className="text-black font-psemibold ml-2"
                    style={{ fontSize: getFontSize(14) }}
                  >
                    View My Prenatal Checklist
                  </Text>
                  <View
                    className="bg-black/10 rounded-full ml-2"
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: scale(2),
                    }}
                  >
                    <Text
                      className="text-black font-pmedium"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      {checkupDates.filter((item) => item.completed).length}/
                      {checkupDates.length}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Chronological Checkup Schedule with Category Badges */}
          {checkupDates.length > 0 && showChecklist && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(16),
              }}
            >
              <View
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                {/* Header */}
                <View
                  className="flex-row items-center justify-between"
                  style={{
                    paddingHorizontal: scale(16),
                    paddingVertical: getSpacing(12),
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(6),
                        marginRight: scale(10),
                        backgroundColor: "#FF9C0115",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="clipboard-check-outline"
                        size={scale(16)}
                        color="#FF9C01"
                      />
                    </View>
                    <Text
                      className="font-psemibold text-black"
                      style={{ fontSize: getFontSize(15) }}
                    >
                      Prenatal Checklist
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <View
                      className="bg-gray-100 rounded-full"
                      style={{
                        paddingHorizontal: scale(8),
                        paddingVertical: scale(4),
                        marginRight: scale(8),
                      }}
                    >
                      <Text
                        className="text-gray-600 font-pmedium"
                        style={{ fontSize: getFontSize(10) }}
                      >
                        {checkupDates.filter((item) => item.completed).length}/
                        {checkupDates.length}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowChecklist(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={scale(18)}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Chronological Checkup Items */}
                <View style={{ padding: scale(12), gap: getSpacing(8) }}>
                  {checkupDates.map((item, index) => {
                    const catInfo = getCategoryInfo(
                      (item as any).category || "",
                    );
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => toggleCheckupStatus(index)}
                        activeOpacity={0.7}
                        className={`rounded-lg border ${
                          item.completed
                            ? "bg-green-50 border-green-200"
                            : "bg-white border-gray-100"
                        }`}
                        style={{ padding: scale(12) }}
                      >
                        <View className="flex-row items-center">
                          <View
                            className="rounded-lg"
                            style={{
                              padding: scale(8),
                              marginRight: scale(12),
                              backgroundColor: item.completed
                                ? "#10B98115"
                                : item.color
                                  ? `${item.color}15`
                                  : "#9CA3AF15",
                            }}
                          >
                            <MaterialCommunityIcons
                              name={
                                item.completed
                                  ? "check-circle"
                                  : (item.icon as any) || "calendar-clock"
                              }
                              size={scale(16)}
                              color={
                                item.completed
                                  ? "#10B981"
                                  : item.color || "#9CA3AF"
                              }
                            />
                          </View>

                          <View className="flex-1">
                            <Text
                              className="font-pmedium text-black"
                              style={{
                                fontSize: getFontSize(12),
                                marginBottom: verticalScale(2),
                              }}
                            >
                              {item.name}
                            </Text>
                            <View
                              className="flex-row items-center"
                              style={{ gap: scale(6) }}
                            >
                              <View className="flex-row items-center">
                                <Ionicons
                                  name="calendar-outline"
                                  size={scale(10)}
                                  color="#9CA3AF"
                                />
                                <Text
                                  className="font-pregular ml-1 text-gray-500"
                                  style={{ fontSize: getFontSize(10) }}
                                >
                                  {item.date}
                                </Text>
                              </View>
                              {catInfo && (
                                <View
                                  className="rounded-full"
                                  style={{
                                    paddingHorizontal: scale(6),
                                    paddingVertical: scale(1),
                                    backgroundColor: `${catInfo.color}15`,
                                  }}
                                >
                                  <Text
                                    className="font-pmedium"
                                    style={{
                                      fontSize: getFontSize(8),
                                      color: catInfo.color,
                                    }}
                                  >
                                    {catInfo.label}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View
                            className="flex-row items-center"
                            style={{ gap: scale(6) }}
                          >
                            {(item as any).hasDocument && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  docUpload.open(item.name);
                                }}
                                hitSlop={{
                                  top: 8,
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                }}
                                className="rounded-full"
                                style={{
                                  padding: scale(4),
                                  backgroundColor: "#3B82F620",
                                }}
                              >
                                <Ionicons
                                  name="cloud-upload-outline"
                                  size={scale(12)}
                                  color="#3B82F6"
                                />
                              </TouchableOpacity>
                            )}
                            <View
                              className="rounded-full"
                              style={{
                                padding: scale(4),
                                backgroundColor: item.completed
                                  ? "#10B98120"
                                  : "#9CA3AF20",
                              }}
                            >
                              <Ionicons
                                name={
                                  item.completed ? "checkmark" : "time-outline"
                                }
                                size={scale(12)}
                                color={item.completed ? "#10B981" : "#9CA3AF"}
                              />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Action Buttons */}
                <View
                  className="flex-row"
                  style={{
                    gap: scale(8),
                    margin: scale(12),
                    marginTop: getSpacing(4),
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={isUploading}
                    className="flex-1 bg-secondary rounded-lg"
                    style={{
                      paddingVertical: getSpacing(12),
                      shadowColor: "#FF9C01",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isUploading ? 0 : 0.15,
                      shadowRadius: 3,
                      elevation: isUploading ? 0 : 2,
                      opacity: isUploading ? 0.7 : 1,
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-center">
                      {isUploading ? (
                        <ActivityIndicator size="small" color="#000" />
                      ) : (
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={scale(16)}
                          color="#000"
                        />
                      )}
                      <Text
                        className="font-psemibold ml-2 text-black"
                        style={{ fontSize: getFontSize(14) }}
                      >
                        {isUploading ? "Syncing..." : "Sync Reminders"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleClearData}
                    disabled={isDeleting}
                    className={`flex-1 rounded-lg border ${
                      isDeleting
                        ? "bg-gray-100 border-gray-200"
                        : "bg-white border-gray-200"
                    }`}
                    style={{
                      paddingVertical: getSpacing(12),
                      opacity: isDeleting ? 0.7 : 1,
                    }}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-center">
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={scale(16)}
                          color="#EF4444"
                        />
                      )}
                      <Text
                        className="font-psemibold ml-2 text-red-600"
                        style={{ fontSize: getFontSize(14) }}
                      >
                        {isDeleting ? "Clearing..." : "Clear"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.ScrollView>
      </SafeAreaView>

      <LoadingSpinner visible={refreshing || pregnancyPlanLoading} />

      <UploadModal
        visible={docUpload.visible}
        onClose={docUpload.close}
        form={docUpload.form}
        setForm={docUpload.setForm as any}
        uploading={docUpload.uploading}
        onSubmit={docUpload.submit}
        onUploadDocument={docUpload.pickDocument}
      />
    </GestureHandlerRootView>
  );
};

export default PregnancyPlanner;
