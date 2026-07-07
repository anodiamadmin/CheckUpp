import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { BlurView } from "expo-blur";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import {
  scale,
  getFontSize,
  getSpacing,
  isVerySmallDevice,
  isSmallDevice,
} from "@/lib/utils/responsiveUtils";

interface YearPickerModalProps {
  visible: boolean;
  currentYear?: number;
  onClose: () => void;
  onConfirm: (year: number) => void;
  title?: string;
  subtitle?: string;
  minYear?: number;
  maxYear?: number;
}

const YearPickerModal: React.FC<YearPickerModalProps> = ({
  visible,
  currentYear,
  onClose,
  onConfirm,
  title = "Select Year",
  subtitle = "Choose Your",
  minYear,
  maxYear,
}) => {
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    if (visible) {
      if (currentYear) {
        setSelectedYear(currentYear.toString());
      } else {
        setSelectedYear(new Date().getFullYear().toString());
      }
    }
  }, [visible, currentYear]);

  const getYearOptions = () => {
    const currentYearValue = new Date().getFullYear();
    const startYear = minYear || currentYearValue - 120;
    const endYear = maxYear || currentYearValue;
    const years = [];

    for (let year = endYear; year >= startYear; year--) {
      years.push(year.toString());
    }
    return years;
  };

  const handleConfirm = () => {
    if (!selectedYear) {
      Alert.alert("Error", "Please select a year");
      return;
    }

    const year = parseInt(selectedYear);
    const maxYearValue = maxYear || new Date().getFullYear();
    const minYearValue = minYear || new Date().getFullYear() - 120;

    if (year > maxYearValue || year < minYearValue) {
      Alert.alert("Error", "Please select a valid year");
      return;
    }

    onConfirm(year);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
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
                      Select Year
                    </Text>
                  </View>

                  {/* Year Picker */}
                  <View className="bg-white rounded-lg overflow-hidden border border-gray-100">
                    <View
                      className="flex-row items-center bg-orange-50"
                      style={{
                        paddingHorizontal: scale(10),
                        paddingVertical: getSpacing(6),
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={scale(14)}
                        color="#FF9C01"
                      />
                      <Text
                        className="font-pmedium text-orange-700"
                        style={{
                          fontSize: getFontSize(10),
                          marginLeft: scale(4),
                        }}
                      >
                        Year
                      </Text>
                    </View>
                    <View>
                      <Picker
                        selectedValue={selectedYear}
                        onValueChange={setSelectedYear}
                        style={{
                          height: isVerySmallDevice
                            ? 150
                            : isSmallDevice
                              ? 180
                              : 200,
                        }}
                        itemStyle={{
                          fontSize: getFontSize(13),
                          color: "#1F2937",
                          fontFamily:
                            Platform.OS === "ios"
                              ? undefined
                              : "Poppins-Medium",
                        }}
                        selectionColor={
                          Platform.OS === "ios" ? "#FF9C01" : undefined
                        }
                      >
                        <Picker.Item
                          label="Select Year"
                          value=""
                          color="#9CA3AF"
                        />
                        {getYearOptions().map((year) => (
                          <Picker.Item
                            key={year}
                            label={year}
                            value={year}
                            color="#1F2937"
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Preview */}
                  {selectedYear && (
                    <View
                      className="bg-orange-50 rounded-lg border border-orange-200"
                      style={{ padding: scale(10), marginTop: getSpacing(12) }}
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
                          {selectedYear}
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
                      Confirm Year
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

export default YearPickerModal;
