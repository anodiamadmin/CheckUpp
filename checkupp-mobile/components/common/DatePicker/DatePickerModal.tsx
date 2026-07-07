import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BlurView } from "expo-blur";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import {
  scale,
  verticalScale,
  getFontSize,
  getSpacing,
  getDeviceFlags,
} from "@/lib/utils/responsiveUtils";

interface DatePickerModalProps {
  visible: boolean;
  currentDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  title?: string;
  subtitle?: string;
  maxDate?: Date;
  minDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onClose,
  onConfirm,
  title = "Date of Birth",
  subtitle = "Select Your",
  maxDate = new Date(),
  minDate,
}) => {
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    if (visible && currentDate) {
      setSelectedDay(currentDate.getDate().toString().padStart(2, "0"));
      setSelectedMonth(
        (currentDate.getMonth() + 1).toString().padStart(2, "0"),
      );
      setSelectedYear(currentDate.getFullYear().toString());
    }
  }, [visible, currentDate]);

  const generateDays = () => {
    const month = parseInt(selectedMonth) || 1;
    const year = parseInt(selectedYear) || 2000;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      (i + 1).toString().padStart(2, "0"),
    );
  };

  const generateMonths = () => {
    const monthNames = [
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
    return monthNames.map((name, index) => ({
      label: name,
      value: (index + 1).toString().padStart(2, "0"),
    }));
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = minDate ? minDate.getFullYear() : currentYear - 100;
    const endYear = maxDate ? maxDate.getFullYear() : currentYear;
    const yearRange = endYear - startYear + 1;

    return Array.from({ length: yearRange }, (_, i) =>
      (endYear - i).toString(),
    );
  };

  const handleConfirm = () => {
    if (!selectedDay || !selectedMonth || !selectedYear) {
      Alert.alert("Error", "Please select a complete date");
      return;
    }

    const newDate = new Date(
      parseInt(selectedYear),
      parseInt(selectedMonth) - 1,
      parseInt(selectedDay),
    );

    // Validate against min/max dates
    if (maxDate && newDate > maxDate) {
      Alert.alert("Error", "Please select a valid date");
      return;
    }

    if (minDate && newDate < minDate) {
      Alert.alert("Error", "Please select a valid date");
      return;
    }

    onConfirm(newDate);
  };

  const renderPicker = (
    value: string,
    onValueChange: (value: string) => void,
    items: { label: string; value: string }[] | string[],
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
  ) => {
    const { isVerySmallDevice, isSmallDevice } = getDeviceFlags();
    const pickerHeight = isVerySmallDevice ? 150 : isSmallDevice ? 180 : 200;

    return (
      <View className="bg-white rounded-lg overflow-hidden border border-gray-100">
        <View
          className="flex-row items-center bg-orange-50"
          style={{
            paddingHorizontal: scale(10),
            paddingVertical: getSpacing(6),
          }}
        >
          <Ionicons name={icon} size={scale(14)} color="#FF9C01" />
          <Text
            className="font-pmedium text-orange-700"
            style={{
              fontSize: getFontSize(10),
              marginLeft: scale(4),
            }}
          >
            {placeholder}
          </Text>
        </View>
        <View>
          <Picker
            selectedValue={value}
            onValueChange={onValueChange}
            style={{ height: pickerHeight }}
            itemStyle={{
              fontSize: getFontSize(13),
              color: "#1F2937",
              fontFamily: Platform.OS === "ios" ? undefined : "Poppins-Medium",
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
  };

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
              <View className="bg-gradient-to-r from-orange-50 to-white rounded-t-3xl">
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
                      className="font-pmedium text-orange-600"
                      style={{
                        fontSize: getFontSize(9),
                        marginBottom: verticalScale(2),
                      }}
                    >
                      {subtitle}
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(16) }}
                    >
                      {title}
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
                <View style={{ marginBottom: getSpacing(16) }}>
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(10) }}
                  >
                    <Text
                      className="font-pmedium text-gray-800"
                      style={{ fontSize: getFontSize(14) }}
                    >
                      Select Date
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
                        generateMonths(),
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

                  {/* Preview */}
                  {selectedDay && selectedMonth && selectedYear && (
                    <View
                      className="bg-orange-50 rounded-lg border border-orange-200"
                      style={{ padding: scale(10) }}
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons
                          name="calendar"
                          size={scale(16)}
                          color="#FF9C01"
                        />
                        <Text
                          className="font-pmedium text-orange-700"
                          style={{
                            fontSize: getFontSize(14),
                            marginLeft: scale(6),
                          }}
                        >
                          {`${selectedDay}/${selectedMonth}/${selectedYear}`}
                        </Text>
                      </View>
                    </View>
                  )}
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
                    onPress={handleConfirm}
                    className="flex-1 rounded-lg bg-orange-400 shadow-md"
                    style={{ paddingVertical: getSpacing(10) }}
                  >
                    <Text
                      className="text-center font-pmedium text-black"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      Confirm Date
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

export default DatePickerModal;
