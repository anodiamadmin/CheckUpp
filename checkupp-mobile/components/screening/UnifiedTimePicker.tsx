import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import {
  getDeviceFlags,
  getFontSize,
  getSpacing,
  scale,
} from "@/lib/utils/responsiveUtils";

type UnifiedTimePickerProps = {
  label: string;
  value: string;
  onChange: (time: string) => void;
  required?: boolean;
  error?: string;
};

const hours = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);
const minutes = Array.from({ length: 60 }, (_, index) =>
  index.toString().padStart(2, "0"),
);

const UnifiedTimePicker = ({
  label,
  value,
  onChange,
  required = false,
  error,
}: UnifiedTimePickerProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");

  useEffect(() => {
    if (!showPicker) return;

    const [hour = "09", minute = "00"] = value.split(":");
    setSelectedHour(hour.padStart(2, "0"));
    setSelectedMinute(minute.padStart(2, "0"));
  }, [showPicker, value]);

  const displayValue = useMemo(() => {
    if (!value) return "Select time";
    return value;
  }, [value]);

  const openPicker = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  const closePicker = async () => {
    await Haptics.selectionAsync();
    setShowPicker(false);
  };

  const confirmTime = async () => {
    if (!selectedHour || !selectedMinute) {
      Alert.alert("Error", "Please select a complete time");
      return;
    }

    const nextValue = `${selectedHour}:${selectedMinute}`;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange(nextValue);
    setShowPicker(false);
  };

  const renderPicker = (
    selectedValue: string,
    onValueChange: (value: string) => void,
    items: string[],
    placeholder: string,
    iconName: keyof typeof Ionicons.glyphMap,
  ) => {
    const { isSmallDevice } = getDeviceFlags();

    return (
      <View className="flex-1 bg-white rounded-lg overflow-hidden border border-gray-100">
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
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={{ height: isSmallDevice ? 180 : 200 }}
          itemStyle={{
            fontSize: getFontSize(13),
            color: "#1F2937",
            fontFamily: Platform.OS === "ios" ? undefined : "Poppins-Medium",
          }}
          selectionColor={Platform.OS === "ios" ? "#FF9C01" : undefined}
        >
          {items.map((item) => (
            <Picker.Item key={item} label={item} value={item} color="#1F2937" />
          ))}
        </Picker>
      </View>
    );
  };

  return (
    <View style={{ marginTop: getSpacing(4) }}>
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(6) }}
      >
        <Ionicons
          name="time-outline"
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

      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.85}
        className={`rounded-xl border bg-white flex-row items-center justify-between ${
          error ? "border-red-300" : "border-gray-200"
        }`}
        style={{
          paddingHorizontal: scale(12),
          paddingVertical: getSpacing(10),
        }}
      >
        <View className="flex-row items-center">
          <View
            className="rounded-full bg-orange-50 items-center justify-center"
            style={{
              width: scale(28),
              height: scale(28),
              marginRight: scale(8),
            }}
          >
            <Ionicons name="time-outline" size={scale(14)} color="#ea580c" />
          </View>
          <View>
            <Text
              className="font-pmedium text-gray-900"
              style={{ fontSize: getFontSize(12) }}
            >
              {displayValue}
            </Text>
            <Text
              className="font-pregular text-gray-500"
              style={{ fontSize: getFontSize(9), marginTop: getSpacing(2) }}
            >
              24-hour time
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={scale(14)} color="#94a3b8" />
      </TouchableOpacity>

      <Text
        className={error ? "text-red-500" : "text-gray-500"}
        style={{
          fontSize: getFontSize(9),
          marginTop: getSpacing(3),
        }}
      >
        {error || "Select the actual appointment time."}
      </Text>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={closePicker}
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={closePicker}>
            <View className="flex-1 justify-end">
              <TouchableWithoutFeedback>
                <View className="bg-white rounded-t-3xl shadow-2xl">
                  <View
                    className="bg-gray-300 rounded-full mx-auto"
                    style={{
                      width: scale(32),
                      height: scale(3),
                      marginTop: getSpacing(6),
                      marginBottom: getSpacing(6),
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
                          marginBottom: getSpacing(2),
                        }}
                      >
                        Select Appointment
                      </Text>
                      <Text
                        className="font-pmedium text-gray-900"
                        style={{ fontSize: getFontSize(16) }}
                      >
                        Time
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={closePicker}
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

                  <View
                    className="flex-row"
                    style={{
                      gap: scale(10),
                      paddingHorizontal: scale(20),
                      paddingBottom: getSpacing(16),
                    }}
                  >
                    {renderPicker(
                      selectedHour,
                      setSelectedHour,
                      hours,
                      "Hour",
                      "time-outline",
                    )}
                    {renderPicker(
                      selectedMinute,
                      setSelectedMinute,
                      minutes,
                      "Minute",
                      "timer-outline",
                    )}
                  </View>

                  <View
                    className="flex-row"
                    style={{
                      gap: scale(8),
                      paddingHorizontal: scale(20),
                      paddingBottom: getSpacing(24),
                    }}
                  >
                    <TouchableOpacity
                      onPress={closePicker}
                      className="flex-1 rounded-xl bg-gray-100 items-center justify-center"
                      style={{ paddingVertical: getSpacing(10) }}
                    >
                      <Text
                        className="font-pmedium text-gray-700"
                        style={{ fontSize: getFontSize(12) }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={confirmTime}
                      className="flex-1 rounded-xl bg-secondary items-center justify-center"
                      style={{ paddingVertical: getSpacing(10) }}
                    >
                      <Text
                        className="font-pmedium text-black"
                        style={{ fontSize: getFontSize(12) }}
                      >
                        Confirm Time
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </BlurView>
      </Modal>
    </View>
  );
};

export default UnifiedTimePicker;
