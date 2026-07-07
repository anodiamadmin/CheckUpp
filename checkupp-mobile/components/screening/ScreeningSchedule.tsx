import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDate } from "@/lib/utils/dateFormatConverter";
import { ScreeningItem } from "@/lib/utils/cancerScreeningChecks";
import { HealthCheckItem } from "@/lib/utils/nutritionChecks";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import ScreeningNextSteps from "./ScreeningNextSteps";
import React, { useEffect, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import {
  BookingChannel,
  BookingStatus,
  BookingStatusDetails,
  getBookingStatus,
  getBookingStatusLabel,
  ScreeningResultRecord,
} from "@/lib/screening/bookingFlow";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

type IconConfig = {
  name: string;
  library: "ionicons" | "mci";
  color: string;
  bg: string;
};

const getItemIcon = (name: string): IconConfig => {
  const n = name.toLowerCase();
  if (n.includes("vision"))
    return {
      name: "eye-outline",
      library: "ionicons",
      color: "#6366F1",
      bg: "#EEF2FF",
    };
  if (n.includes("dental"))
    return {
      name: "tooth-outline",
      library: "mci",
      color: "#3B82F6",
      bg: "#EFF6FF",
    };
  if (n.includes("mental"))
    return { name: "brain", library: "mci", color: "#10B981", bg: "#ECFDF5" };
  if (n.includes("cardiovascular") || n.includes("heart"))
    return {
      name: "heart-outline",
      library: "ionicons",
      color: "#EF4444",
      bg: "#FEF2F2",
    };
  if (n.includes("diabetes"))
    return {
      name: "water-outline",
      library: "ionicons",
      color: "#F59E0B",
      bg: "#FFFBEB",
    };
  if (n.includes("cervical"))
    return {
      name: "ribbon-outline",
      library: "ionicons",
      color: "#EC4899",
      bg: "#FDF2F8",
    };
  if (n.includes("breast"))
    return {
      name: "ribbon-outline",
      library: "ionicons",
      color: "#EC4899",
      bg: "#FDF2F8",
    };
  if (n.includes("bowel") || n.includes("fobt"))
    return {
      name: "fitness-outline",
      library: "ionicons",
      color: "#8B5CF6",
      bg: "#F5F3FF",
    };
  if (n.includes("prostate") || n.includes("psa"))
    return {
      name: "male-outline",
      library: "ionicons",
      color: "#0EA5E9",
      bg: "#F0F9FF",
    };
  if (n.includes("lung"))
    return { name: "lungs", library: "mci", color: "#06B6D4", bg: "#ECFEFF" };
  return {
    name: "medkit-outline",
    library: "ionicons",
    color: "#FF9C01",
    bg: "#FFF7ED",
  };
};

type ScreeningScheduleProps = {
  items: (ScreeningItem | HealthCheckItem)[];
  type: "cancer" | "health";
  title: string;
  toggleScreeningStatus: (index: number, type: "cancer" | "health") => void;
  onUploadDocument?: (name: string, type: "cancer" | "health") => void;
  onBookingStatusChange?: (
    name: string,
    type: "cancer" | "health",
    status: BookingStatus,
    channel?: BookingChannel,
    details?: BookingStatusDetails,
  ) => void;
  testResults?: Record<string, ScreeningResultRecord>;
  healthResults?: Record<string, ScreeningResultRecord>;
  history?: ScreeningHistory;
};

const ScreeningSchedule = ({
  items,
  type,
  title,
  toggleScreeningStatus,
  onUploadDocument,
  testResults,
  healthResults,
  onBookingStatusChange,
}: ScreeningScheduleProps) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnims, setScaleAnims] = useState<Animated.Value[]>([]);
  const [gestureBookingItemName, setGestureBookingItemName] = useState<
    string | null
  >(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setScaleAnims(items.map(() => new Animated.Value(1)));
  }, [items, fadeAnim]);

  const handleItemPress = (index: number) => {
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.97,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        tension: 300,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toggleScreeningStatus(index, type);
    });
  };

  const eligibleItems = items.filter((item) => item.eligible);
  const resultData = type === "cancer" ? testResults : healthResults;
  const bookingActionAvailableFor = (itemName: string, completed: boolean) =>
    !completed && Boolean(getBookingStatus(resultData?.[itemName]));
  const gestureBookingItem =
    gestureBookingItemName !== null
      ? eligibleItems.find((entry) => entry.name === gestureBookingItemName) ||
        null
      : null;
  const gestureBookingRecord =
    gestureBookingItemName !== null
      ? resultData?.[gestureBookingItemName]
      : undefined;

  if (eligibleItems.length === 0) {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View
          className="bg-white rounded-xl border border-gray-100"
          style={{
            padding: scale(20),
            marginBottom: getSpacing(8),
            alignItems: "center",
          }}
        >
          <View
            className="rounded-full items-center justify-center"
            style={{
              width: scale(48),
              height: scale(48),
              marginBottom: getSpacing(10),
              backgroundColor: "#D1FAE5",
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={scale(24)}
              color="#10B981"
            />
          </View>
          <Text
            className="font-psemibold text-gray-900 text-center"
            style={{ fontSize: getFontSize(13), marginBottom: getSpacing(4) }}
          >
            All Clear!
          </Text>
          <Text
            className="font-pregular text-gray-500 text-center"
            style={{ fontSize: getFontSize(10), lineHeight: getFontSize(14) }}
          >
            No screenings needed based on your profile.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View
        className="bg-white rounded-xl border border-gray-100 overflow-hidden"
        style={{ padding: scale(12) }}
      >
        <View
          className="flex-row items-center"
          style={{ marginBottom: getSpacing(10) }}
        >
          <Ionicons
            name={type === "cancer" ? "medical" : "fitness"}
            size={scale(16)}
            color="#FF9C01"
          />
          <Text
            className="font-psemibold text-gray-800"
            style={{
              fontSize: getFontSize(14),
              marginLeft: scale(6),
            }}
          >
            Scheduled Screenings
          </Text>
        </View>
        <View style={{ gap: getSpacing(8) }}>
          {eligibleItems.map((item, index) => {
            const hasResult = resultData && resultData[item.name];
            const itemIndex = items.findIndex((i) => i.name === item.name);
            const bookingStatus = getBookingStatus(resultData?.[item.name]);
            const showBookingStatus = hasResult && !item.completed;
            const icon = getItemIcon(item.name);

            return (
              <Animated.View
                key={index}
                style={{
                  transform: [
                    { scale: scaleAnims[itemIndex] || new Animated.Value(1) },
                  ],
                }}
              >
                <View
                  className={`rounded-lg border ${
                    item.completed
                      ? "bg-green-50 border-green-200"
                      : "bg-white border-gray-100"
                  }`}
                  style={{ padding: scale(12) }}
                >
                  <TouchableOpacity
                    onPress={() => handleItemPress(itemIndex)}
                    onLongPress={() => {
                      if (
                        bookingActionAvailableFor(item.name, item.completed)
                      ) {
                        setGestureBookingItemName(item.name);
                      }
                    }}
                    delayLongPress={250}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      {/* Icon bubble */}
                      <View
                        className="rounded-full items-center justify-center"
                        style={{
                          width: scale(40),
                          height: scale(40),
                          backgroundColor: item.completed ? "#D1FAE5" : icon.bg,
                          marginRight: scale(12),
                        }}
                      >
                        {icon.library === "mci" ? (
                          <MaterialCommunityIcons
                            name={icon.name as any}
                            size={scale(20)}
                            color={item.completed ? "#10B981" : icon.color}
                          />
                        ) : (
                          <Ionicons
                            name={icon.name as any}
                            size={scale(20)}
                            color={item.completed ? "#10B981" : icon.color}
                          />
                        )}
                      </View>

                      {/* Content */}
                      <View className="flex-1">
                        <Text
                          className={`font-psemibold ${item.completed ? "text-gray-400" : "text-gray-900"}`}
                          style={{ fontSize: getFontSize(14) }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <View
                          className="flex-row items-center flex-wrap"
                          style={{ marginTop: getSpacing(3), gap: scale(6) }}
                        >
                          <View className="flex-row items-center">
                            <Ionicons
                              name="calendar-outline"
                              size={scale(11)}
                              color="#9CA3AF"
                              style={{ marginRight: scale(3) }}
                            />
                            <Text
                              className="font-pregular text-gray-500"
                              style={{ fontSize: getFontSize(11) }}
                            >
                              {formatDate(item.date)}
                            </Text>
                          </View>

                          {showBookingStatus && (
                            <View className="flex-row items-center">
                              <Ionicons
                                name={
                                  bookingStatus === "confirmed"
                                    ? "checkmark-circle"
                                    : "alert-circle"
                                }
                                size={scale(11)}
                                color={
                                  bookingStatus === "confirmed"
                                    ? "#22c55e"
                                    : "#f59e0b"
                                }
                                style={{ marginRight: scale(3) }}
                              />
                              <Text
                                className="font-pregular"
                                style={{
                                  fontSize: getFontSize(11),
                                  color:
                                    bookingStatus === "confirmed"
                                      ? "#22c55e"
                                      : "#f59e0b",
                                }}
                              >
                                {getBookingStatusLabel(
                                  resultData![item.name],
                                ) || resultData![item.name].result}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Right indicator */}
                      <View
                        className="rounded-full items-center justify-center"
                        style={{
                          width: scale(30),
                          height: scale(30),
                          backgroundColor: item.completed
                            ? "#D1FAE5"
                            : "#F3F4F6",
                        }}
                      >
                        <Ionicons
                          name={item.completed ? "checkmark" : "time-outline"}
                          size={scale(14)}
                          color={item.completed ? "#10B981" : "#9CA3AF"}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Booking section */}
                  {bookingActionAvailableFor(item.name, item.completed) && (
                    <View
                      style={{
                        paddingHorizontal: scale(14),
                        paddingBottom: scale(12),
                        paddingTop: 0,
                      }}
                    >
                      <ScreeningNextSteps
                        item={{ name: item.name, date: item.date }}
                        record={resultData?.[item.name]}
                        onBookingStatusChange={
                          onBookingStatusChange
                            ? (status, channel, details) =>
                                onBookingStatusChange(
                                  item.name,
                                  type,
                                  status,
                                  channel,
                                  details,
                                )
                            : undefined
                        }
                      />
                    </View>
                  )}

                  {/* Upload document link */}
                  {onUploadDocument && !item.completed && (
                    <TouchableOpacity
                      onPress={() => onUploadDocument(item.name, type)}
                      className="flex-row items-center"
                      style={{
                        paddingHorizontal: scale(14),
                        paddingBottom: scale(12),
                        paddingTop: bookingActionAvailableFor(
                          item.name,
                          item.completed,
                        )
                          ? 0
                          : scale(4),
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={scale(14)}
                        color="#3B82F6"
                        style={{ marginRight: scale(6) }}
                      />
                      <Text
                        className="font-pmedium"
                        style={{ fontSize: getFontSize(12), color: "#3B82F6" }}
                      >
                        Upload document
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {gestureBookingItem && (
        <ScreeningNextSteps
          item={{
            name: gestureBookingItem.name,
            date: gestureBookingItem.date,
          }}
          record={gestureBookingRecord}
          visible
          hideInlineCard
          onClose={() => setGestureBookingItemName(null)}
          onBookingStatusChange={
            onBookingStatusChange
              ? (status, channel, details) =>
                  onBookingStatusChange(
                    gestureBookingItem.name,
                    type,
                    status,
                    channel,
                    details,
                  )
              : undefined
          }
        />
      )}
    </Animated.View>
  );
};

export default ScreeningSchedule;
