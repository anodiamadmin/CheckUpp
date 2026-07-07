import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface DatePickerInputProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  editable?: boolean;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onPress,
  placeholder = "Select date",
  required = false,
  icon = "calendar-outline",
  editable = true,
}) => {
  return (
    <View
      className={label ? "bg-white rounded-lg border border-gray-100" : ""}
      style={
        label
          ? {
              padding: scale(10),
              marginBottom: getSpacing(8),
            }
          : {}
      }
    >
      {label && (
        <View className="flex-row justify-between items-center">
          <Text
            className="font-pmedium text-gray-900"
            style={{ fontSize: getFontSize(13) }}
          >
            {label} {required && <Text className="text-orange-500">*</Text>}
          </Text>
          {!editable && (
            <View
              className="bg-orange-50 rounded-full"
              style={{
                paddingHorizontal: scale(6),
                paddingVertical: scale(2),
              }}
            >
              <Text
                className="text-orange-600 font-pmedium"
                style={{ fontSize: getFontSize(9) }}
              >
                Read Only
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={editable ? onPress : undefined}
        disabled={!editable}
        className={`flex-row items-center ${
          !label
            ? "bg-gray-50 border border-gray-200 rounded-lg justify-center"
            : ""
        }`}
        style={
          label
            ? { marginTop: getSpacing(6) }
            : {
                paddingVertical: getSpacing(12),
                paddingHorizontal: scale(16),
              }
        }
        activeOpacity={0.7}
      >
        {!label && (
          <Ionicons
            name={icon}
            size={scale(16)}
            color="#FF9C01"
            style={{ marginRight: scale(8) }}
          />
        )}
        <Text
          className={`${label ? "flex-1" : ""} font-${
            label ? "pregular" : "pmedium"
          } ${value ? "text-gray-900" : "text-gray-400"} ${
            !editable ? "text-gray-600 bg-gray-50" : ""
          } ${!label ? "text-black" : ""}`}
          style={{
            fontSize: getFontSize(label ? 12 : 13),
            paddingVertical: label ? getSpacing(4) : 0,
          }}
        >
          {value || placeholder}
        </Text>
        {label && (
          <Ionicons
            name={editable ? icon : "lock-closed"}
            size={scale(16)}
            color={editable ? "#FF9C01" : "#9CA3AF"}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default DatePickerInput;
