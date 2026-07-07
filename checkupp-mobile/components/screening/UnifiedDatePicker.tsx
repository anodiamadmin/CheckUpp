import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";
import { BlurView } from "expo-blur";
import {
  scale,
  getFontSize,
  getSpacing,
  screenDimensions,
  getDeviceFlags,
} from "@/lib/utils/responsiveUtils";

interface UnifiedDatePickerProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  required?: boolean;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  mode?: "date" | "yearOnly";
  minDate?: Date;
  maxDate?: Date;
}

const UnifiedDatePicker: React.FC<UnifiedDatePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  error,
  icon = "calendar-outline",
  mode = "date",
  minDate,
  maxDate = new Date(),
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    if (showPicker && value) {
      setSelectedDay(value.getDate().toString().padStart(2, "0"));
      setSelectedMonth((value.getMonth() + 1).toString().padStart(2, "0"));
      setSelectedYear(value.getFullYear().toString());
    }
  }, [showPicker, value]);

  const handleDateConfirm = () => {
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

    onChange(newDate);
    setShowPicker(false);
  };

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

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = minDate ? minDate.getFullYear() : currentYear - 100;
    const endYear = maxDate ? maxDate.getFullYear() : currentYear;
    const years = [];

    for (let year = endYear; year >= startYear; year--) {
      years.push(year.toString());
    }
    return years;
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(value);
    newDate.setFullYear(parseInt(year));
    onChange(newDate);
  };

  const formatDisplayValue = () => {
    if (mode === "yearOnly") {
      return value.getFullYear().toString();
    }
    return format(value, "MMM dd, yyyy");
  };

  const renderPicker = (
    selectedValue: string,
    onValueChange: (value: string) => void,
    items: { label: string; value: string }[] | string[],
    placeholder: string,
    iconName: keyof typeof Ionicons.glyphMap,
  ) => {
    const { isSmallDevice } = getDeviceFlags();
    const pickerHeight = isSmallDevice ? 180 : 200;

    return (
      <View className="bg-white rounded-lg overflow-hidden border border-gray-100">
        <View
          className="flex-row items-center bg-orange-50"
          style={{
            paddingHorizontal: scale(10),
            paddingVertical: getSpacing(6),
          }}
        >
          <Ionicons name={iconName} size={scale(14)} color="#FF9C01" />
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
            selectedValue={selectedValue}
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
    <View style={{ marginBottom: getSpacing(12) }}>
      {/* Label */}
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(6) }}
      >
        <Ionicons
          name={icon}
          size={scale(12)}
          color="#FF9C01"
          style={{ marginRight: scale(5) }}
        />
        <Text
          className="font-pmedium text-gray-700"
          style={{ fontSize: getFontSize(12) }}
        >
          {label}
          {required && <Text className="text-[#FF9C01]"> *</Text>}
        </Text>
      </View>

      {/* Date Display Button */}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        className={`flex-row items-center justify-between bg-gray-50 rounded-lg border ${
          error ? "border-red-300" : "border-gray-200"
        }`}
        style={{
          paddingHorizontal: scale(10),
          paddingVertical: getSpacing(10),
          minHeight: scale(40),
        }}
      >
        <Text
          className="font-pregular text-gray-900"
          style={{ fontSize: getFontSize(13) }}
        >
          {formatDisplayValue()}
        </Text>
        <Ionicons name="chevron-down" size={scale(16)} color="#FF9C01" />
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <View
          className="flex-row items-center"
          style={{ marginTop: getSpacing(4) }}
        >
          <Ionicons
            name="alert-circle"
            size={scale(10)}
            color="#ef4444"
            style={{ marginRight: scale(4) }}
          />
          <Text
            className="font-pregular text-red-600"
            style={{ fontSize: getFontSize(10) }}
          >
            {error}
          </Text>
        </View>
      )}

      {/* Picker Modal - Year Only */}
      {mode === "yearOnly" && showPicker && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View
              className="bg-white rounded-2xl overflow-hidden"
              style={{
                width: screenDimensions.width * 0.8,
              }}
            >
              {/* Header */}
              <View
                className="bg-[#FFF5E6] border-b border-[#FFECD1]"
                style={{
                  paddingHorizontal: scale(20),
                  paddingVertical: getSpacing(16),
                }}
              >
                <Text
                  className="font-psemibold text-gray-900 text-center"
                  style={{ fontSize: getFontSize(16) }}
                >
                  Select Year
                </Text>
              </View>

              {/* Year Picker */}
              <Picker
                selectedValue={value.getFullYear().toString()}
                onValueChange={handleYearChange}
                style={{
                  height: scale(200),
                }}
                itemStyle={{
                  fontSize: getFontSize(16),
                  color: "#1F2937",
                  fontFamily:
                    Platform.OS === "ios" ? undefined : "Poppins-Regular",
                }}
                selectionColor={Platform.OS === "ios" ? "#FF9C01" : undefined}
              >
                {getYearOptions().map((year) => (
                  <Picker.Item key={year} label={year} value={year} />
                ))}
              </Picker>

              {/* Done Button */}
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                className="bg-[#FF9C01]"
                style={{
                  paddingVertical: getSpacing(14),
                }}
                activeOpacity={0.8}
              >
                <Text
                  className="font-psemibold text-white text-center"
                  style={{ fontSize: getFontSize(15) }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker - Full Date */}
      {mode === "date" && showPicker && (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
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
                            marginBottom: scale(2),
                          }}
                        >
                          Select Your
                        </Text>
                        <Text
                          className="font-pmedium text-gray-900"
                          style={{ fontSize: getFontSize(16) }}
                        >
                          {label}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setShowPicker(false)}
                        className="items-center justify-center rounded-full bg-gray-100"
                        style={{
                          width: scale(32),
                          height: scale(32),
                        }}
                      >
                        <AntDesign
                          name="close"
                          size={scale(16)}
                          color="#4B5563"
                        />
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
                            getYearOptions(),
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
                        onPress={() => setShowPicker(false)}
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
                        onPress={handleDateConfirm}
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
      )}
    </View>
  );
};

export default UnifiedDatePicker;
