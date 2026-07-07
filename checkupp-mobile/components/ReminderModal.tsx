import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Alert,
  StyleSheet,
  Dimensions,
  PixelRatio,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");
const constrainedWidth = Math.min(width, 430);
const constrainedHeight = Math.min(height, 900);

// Responsive scaling
const scale = (size: number) => (constrainedWidth / 350) * size;
const verticalScale = (size: number) => (constrainedHeight / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (constrainedWidth < 320) return moderateScale(size, 0.15);
  if (constrainedWidth < 350) return moderateScale(size, 0.18);
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

interface ReminderModalProps {
  visible: boolean;
  date: string;
  reminderType: string;
  setDate: (date: string) => void;
  setTime: (time: string) => void;
  setReminderType: (type: string) => void;
  onClose: () => void;
  onSave: (type: string, date: string, time: string) => void;
}

const ReminderModal = ({
  visible,
  date,
  reminderType,
  setDate,
  setTime,
  setReminderType,
  onClose,
  onSave,
}: ReminderModalProps) => {
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [reminderText, setReminderText] = useState(reminderType);

  useEffect(() => {
    const [year, month, day] = date.split("-");
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedDay(day);
    setTime("09:00");
  }, [date, setTime]);

  useEffect(() => {
    if (!visible) {
      setSelectedYear("");
      setSelectedMonth("");
      setSelectedDay("");
      setReminderText("");
    }
  }, [visible]);

  const generateDays = () => {
    return Array.from({ length: 31 }, (_, i) =>
      (i + 1).toString().padStart(2, "0"),
    );
  };

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => (currentYear + i).toString());
  };

  const handleSave = () => {
    if (!selectedDay || !selectedMonth || !selectedYear) {
      Alert.alert("Error", "Please select a complete date");
      return;
    }

    const selectedDate = `${selectedDay}/${selectedMonth}/${selectedYear}`;
    const selectedTime = "09:00";
    onSave(reminderText, selectedDate, selectedTime);
  };

  const renderPicker = (
    value: string,
    onValueChange: (value: string) => void,
    items: { label: string; value: string }[] | string[],
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
  ) => (
    <View className="bg-white rounded-lg overflow-hidden border border-gray-100">
      <View
        className="flex-row items-center bg-gray-50"
        style={{
          paddingHorizontal: scale(8),
          paddingVertical: getSpacing(4),
        }}
      >
        <Ionicons name={icon} size={scale(14)} color="#4B5563" />
        <Text
          className="font-pmedium text-gray-700"
          style={{
            fontSize: getFontSize(10),
            marginLeft: scale(6),
          }}
        >
          {placeholder}
        </Text>
      </View>
      <View>
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={{
            height: isVerySmallDevice ? 120 : isSmallDevice ? 140 : 160,
          }}
          itemStyle={{
            fontSize: getFontSize(12),
            color: "#1F2937",
            fontFamily: Platform.OS === "ios" ? undefined : "Poppins-Regular",
          }}
          selectionColor={Platform.OS === "ios" ? "#FF9C01" : undefined}
        >
          <Picker.Item
            label={`Select ${placeholder}`}
            value=""
            color="#9CA3AF"
          />
          {items.map((item) => {
            const label = typeof item === "string" ? item : item.label;
            const itemValue = typeof item === "string" ? item : item.value;
            return (
              <Picker.Item
                key={itemValue}
                label={label}
                value={itemValue}
                color="#1F2937"
              />
            );
          })}
        </Picker>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl shadow-2xl">
              {/* Header */}
              <View className="bg-gradient-to-r from-gray-50 to-white rounded-t-3xl">
                <View
                  className="bg-gray-300 rounded-full mx-auto"
                  style={{
                    width: scale(32),
                    height: scale(3),
                    marginTop: getSpacing(6),
                    marginBottom: getSpacing(4),
                  }}
                />

                <View
                  className="flex-row justify-between items-center"
                  style={{
                    paddingHorizontal: scale(20),
                    paddingBottom: getSpacing(12),
                  }}
                >
                  <View>
                    <Text
                      className="font-pmedium text-gray-500"
                      style={{
                        fontSize: getFontSize(9),
                        marginBottom: verticalScale(2),
                      }}
                    >
                      Create New
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(16) }}
                    >
                      Reminder
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={onClose}
                    className="items-center justify-center rounded-full bg-gray-100"
                    style={{
                      width: scale(32),
                      height: scale(32),
                    }}
                  >
                    <AntDesign name="close" size={scale(16)} color="#4B5563" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Content */}
              <View
                style={{
                  paddingHorizontal: scale(20),
                  paddingVertical: getSpacing(16),
                }}
              >
                {/* Reminder Input */}
                <View
                  className="bg-white rounded-lg border border-gray-100"
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(16),
                  }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(6) }}
                  >
                    <MaterialIcons
                      name="edit-note"
                      size={scale(16)}
                      color="#4B5563"
                    />
                    <Text
                      className="font-pmedium text-gray-700"
                      style={{
                        fontSize: getFontSize(12),
                        marginLeft: scale(6),
                      }}
                    >
                      Reminder Details
                    </Text>
                  </View>
                  <TextInput
                    value={reminderText}
                    onChangeText={setReminderText}
                    placeholder="What would you like to be reminded about?"
                    placeholderTextColor="#9CA3AF"
                    className="font-pmedium text-gray-900"
                    style={{
                      fontSize: getFontSize(13),
                      marginLeft: -scale(2),
                    }}
                  />
                </View>

                {/* Date Selection */}
                <View style={{ marginBottom: getSpacing(16) }}>
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(8) }}
                  >
                    <Text
                      className="font-pmedium text-gray-800"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      Reminder Date
                    </Text>
                  </View>

                  {/* Date Pickers */}
                  <View
                    className="flex-row"
                    style={{
                      gap: scale(4),
                      marginBottom: getSpacing(16),
                    }}
                  >
                    <View className="flex-1">
                      {renderPicker(
                        selectedDay,
                        setSelectedDay,
                        generateDays(),
                        "Day",
                        "calendar-outline",
                      )}
                    </View>
                    <View className="flex-1">
                      {renderPicker(
                        selectedMonth,
                        setSelectedMonth,
                        months,
                        "Month",
                        "calendar-outline",
                      )}
                    </View>
                    <View className="flex-1">
                      {renderPicker(
                        selectedYear,
                        setSelectedYear,
                        generateYears(),
                        "Year",
                        "calendar-outline",
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View
                style={{
                  paddingHorizontal: scale(20),
                  paddingBottom: getSpacing(24),
                  paddingTop: getSpacing(8),
                }}
              >
                <View className="flex-row" style={{ gap: scale(12) }}>
                  <TouchableOpacity
                    onPress={onClose}
                    className="flex-1 rounded-lg bg-gray-100"
                    style={{ paddingVertical: getSpacing(10) }}
                  >
                    <Text
                      className="text-center font-pmedium text-gray-600"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    className="flex-1 rounded-lg bg-orange-400 shadow-md"
                    style={{ paddingVertical: getSpacing(10) }}
                  >
                    <Text
                      className="text-center font-pmedium text-black"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      Set Reminder
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </BlurView>
    </Modal>
  );
};

export default ReminderModal;
