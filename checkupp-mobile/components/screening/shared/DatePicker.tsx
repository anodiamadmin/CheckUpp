import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface DatePickerFieldProps {
  label: string;
  value: string;
  onPress: () => void;
  required?: boolean;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onPress,
  required = false,
}) => {
  return (
    <>
      <Text
        className="font-pmedium text-gray-700"
        style={{
          fontSize: getFontSize(12),
          marginBottom: getSpacing(4),
        }}
      >
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        className="border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
        style={{
          paddingHorizontal: scale(12),
          paddingVertical: getSpacing(10),
        }}
      >
        <Text
          className="font-pregular text-gray-900"
          style={{ fontSize: getFontSize(13) }}
        >
          {value}
        </Text>
        <Ionicons name="calendar-outline" size={scale(16)} color="#64748b" />
      </TouchableOpacity>
    </>
  );
};

export default DatePickerField;
