import {
  View,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
  Platform,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import {
  loadReminders,
  saveReminders,
  removeReminder,
} from "@/lib/notifications/reminders";
import { useToast } from "@/components/ToastProvider";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useState, useEffect, useCallback } from "react";
import ReminderItem from "@/components/ReminderItem";
import ReminderModal from "@/components/ReminderModal";
import { LinearGradient } from "expo-linear-gradient";
import { cancelSelectedNotifications } from "@/lib/notifications/cancelAllNotifications";
import { getNotificationIdentifiersByTitles } from "@/lib/notifications/getNotifications";
import { useRouter } from "expo-router";

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

// Month name mapping for parsing
const monthMap: { [key: string]: number } = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11,
};

const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  try {
    let day: number, month: number, year: number;

    const separators = ["/", "-"];
    let parts: string[] = [];

    for (const separator of separators) {
      if (dateString.includes(separator)) {
        parts = dateString.split(separator);
        break;
      }
    }

    if (parts.length !== 3) {
      const isoDate = new Date(dateString);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      throw new Error(`Invalid date format: ${dateString}`);
    }

    day = parseInt(parts[0], 10);
    year = parseInt(parts[2], 10);

    const monthPart = parts[1];
    if (isNaN(parseInt(monthPart, 10))) {
      const monthName =
        monthPart.charAt(0).toUpperCase() + monthPart.slice(1).toLowerCase();
      month = monthMap[monthName];
      if (month === undefined) {
        throw new Error(`Invalid month name: ${monthPart}`);
      }
    } else {
      month = parseInt(monthPart, 10) - 1;
    }

    // Validate parsed values
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error(
        `Invalid date components: day=${day}, month=${month}, year=${year}`,
      );
    }

    if (day < 1 || day > 31 || month < 0 || month > 11 || year < 1000) {
      throw new Error(
        `Date values out of range: day=${day}, month=${month + 1}, year=${year}`,
      );
    }

    return new Date(year, month, day);
  } catch (error) {
    console.error("Date parsing error:", error);
    return null;
  }
};

// Helper function to parse time
const parseTime = (
  timeString: string,
): { hour: number; minute: number } | null => {
  if (!timeString) return null;

  try {
    const [hourStr, minuteStr] = timeString.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (
      isNaN(hour) ||
      isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      throw new Error(`Invalid time: ${timeString}`);
    }

    return { hour, minute };
  } catch (error) {
    console.error("Time parsing error:", error);
    return null;
  }
};

interface Reminder {
  id: string;
  type: string;
  dueDate: string;
}

const RemindersScreen = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [searchQuery] = useState<string>("");
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [newReminderType, setNewReminderType] = useState<string>("");
  const [filteredReminders, setFilteredReminders] = useState<Reminder[]>([]);
  const [date, setDate] = useState<any>("");
  const [, setSelectedTime] = useState<any>("");
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const loadedReminders = await loadReminders();
        setReminders(loadedReminders);
      } catch (error) {
        console.error("Failed to load reminders", error);
      }
    };

    fetchReminders();
  }, []);

  const filterReminders = useCallback(() => {
    const filteredReminders = reminders.filter(
      (reminder) =>
        reminder.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reminder.dueDate.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    setFilteredReminders(filteredReminders);
  }, [reminders, searchQuery]);

  useEffect(() => {
    filterReminders();
  }, [filterReminders]);

  const handleAddReminder = async (
    type: string,
    date: string,
    time: string,
  ) => {
    if (!type || !date || !time) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      // Parse the date
      const parsedDate = parseDate(date);
      if (!parsedDate) {
        Alert.alert(
          "Error",
          "Invalid date format. Please select a valid date.",
        );
        return;
      }

      // Parse the time
      const parsedTime = parseTime(time);
      if (!parsedTime) {
        Alert.alert(
          "Error",
          "Invalid time format. Please select a valid time.",
        );
        return;
      }

      // Combine date and time
      const selectedDate = new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
        parsedTime.hour,
        parsedTime.minute,
        0,
        0,
      );

      // Validate the combined date
      if (isNaN(selectedDate.getTime())) {
        Alert.alert("Error", "Invalid date and time combination.");
        return;
      }

      const currentDate = new Date();

      if (selectedDate <= currentDate) {
        Alert.alert(
          "Error",
          "Please select a future date and time for the reminder.",
        );
        return;
      }

      const newReminder: Reminder = {
        id: Date.now().toString(),
        type: type,
        dueDate: selectedDate.toISOString(),
      };

      const updatedReminders = [...reminders, newReminder];
      setReminders(updatedReminders);
      await saveReminders(updatedReminders);
      resetNewReminderFields();
      setAddModalVisible(false);

      const notification = {
        date: selectedDate.toISOString(),
        title: type,
        body: `Your reminder is due on ${selectedDate.toLocaleString()}.`,
      };

      await scheduleNotifications([notification]);

      showToast("Reminder added successfully", "success");
    } catch (error) {
      console.error("Error adding reminder:", error);
      showToast(
        `Error adding reminder: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  };

  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this reminder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const reminderToDelete = reminders.find(
                (reminder) => reminder.id === id,
              );
              if (!reminderToDelete) {
                throw new Error("Reminder not found");
              }

              const notificationIdentifiers =
                await getNotificationIdentifiersByTitles([
                  reminderToDelete.type,
                ]);

              if (notificationIdentifiers.length > 0) {
                await cancelSelectedNotifications(notificationIdentifiers);
              }

              await removeReminder(id);

              setReminders((prevReminders) =>
                prevReminders.filter((reminder) => reminder.id !== id),
              );

              showToast("Reminder deleted successfully", "success");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to delete reminder. Please try again.",
                [{ text: "OK" }],
              );
              console.error("Delete reminder error:", error);
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const resetNewReminderFields = () => {
    setNewReminderType("");
    setSelectedTime("");
    setDate("");
  };

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <ReminderItem item={item} onDelete={handleDeleteReminder} />
  );

  const renderModal = () => (
    <ReminderModal
      visible={addModalVisible}
      date={date}
      reminderType={newReminderType}
      setDate={setDate}
      setTime={setSelectedTime}
      setReminderType={setNewReminderType}
      onClose={() => {
        setAddModalVisible(false);
        resetNewReminderFields();
      }}
      onSave={(newReminderType, date, time) => {
        handleAddReminder(newReminderType, date, time);
      }}
    />
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={["#ffffff", "#f8f8f8"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          {/* Compact Header */}
          <View
            style={{
              paddingHorizontal: scale(12),
              paddingVertical: getSpacing(8),
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={scale(18)}
                  color="#FF9C01"
                />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <Text
                  className="font-psemibold text-gray-800"
                  style={{ fontSize: getFontSize(18) }}
                >
                  Reminders
                </Text>
              </View>

              <TouchableOpacity
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={scale(16)}
                  color="#FF9C01"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Card */}
          <View
            className="flex-1 bg-white rounded-3xl overflow-hidden shadow-md"
            style={{ marginHorizontal: scale(12) }}
          >
            <View
              className="flex-row justify-between items-center"
              style={{
                paddingHorizontal: scale(16),
                paddingTop: getSpacing(16),
                paddingBottom: getSpacing(8),
              }}
            >
              <Text
                className="font-psemibold text-gray-800"
                style={{ fontSize: getFontSize(16) }}
              >
                My Reminders
              </Text>
              <View className="flex-row">
                <TouchableOpacity>
                  <Ionicons
                    name="options-outline"
                    size={scale(18)}
                    color="#FF9C01"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {filteredReminders.length > 0 ? (
              <FlatList
                data={filteredReminders}
                keyExtractor={(item) => item.id}
                renderItem={renderReminderItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  padding: scale(12),
                  paddingBottom: getTabBarSafeBottomPadding(),
                }}
                ItemSeparatorComponent={() => (
                  <View style={{ height: getSpacing(6) }} />
                )}
              />
            ) : (
              <View
                className="flex-1 justify-center items-center"
                style={{
                  paddingVertical: getSpacing(30),
                  paddingHorizontal: scale(20),
                }}
              >
                <View
                  className="bg-orange-50 rounded-full items-center justify-center"
                  style={{
                    padding: scale(16),
                    marginBottom: getSpacing(12),
                  }}
                >
                  <Ionicons
                    name="alarm-outline"
                    size={scale(40)}
                    color="#FF9C01"
                  />
                </View>
                <Text
                  className="font-psemibold text-gray-700 text-center"
                  style={{ fontSize: getFontSize(16) }}
                >
                  No reminders yet
                </Text>
                <Text
                  className="text-gray-500 font-pregular text-center"
                  style={{
                    fontSize: getFontSize(11),
                    marginTop: getSpacing(6),
                    maxWidth: scale(240),
                    lineHeight: getFontSize(16),
                  }}
                >
                  Tap the plus button below to create your first reminder and
                  stay organized
                </Text>
              </View>
            )}
          </View>

          {/* Compact FAB */}
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
            style={{
              position: "absolute",
              bottom: insets.bottom ? insets.bottom + scale(12) : scale(20),
              right: scale(20),
              backgroundColor: "#FF9C01",
              borderRadius: scale(24),
              width: scale(48),
              height: scale(48),
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#FF9C01",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 6,
            }}
            accessibilityLabel="Add New Reminder"
            accessibilityHint="Tap to open the add reminder modal"
          >
            <AntDesign name="plus" size={scale(20)} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      {renderModal()}
    </GestureHandlerRootView>
  );
};

export default RemindersScreen;
