import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface CheckboxProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, value, onValueChange }) => {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      className="flex-row items-center"
      style={{ marginBottom: getSpacing(8) }}
    >
      <View
        className={`rounded border-2 items-center justify-center ${
          value ? "bg-secondary border-secondary" : "bg-white border-gray-300"
        }`}
        style={{
          width: scale(20),
          height: scale(20),
          marginRight: scale(10),
        }}
      >
        {value && <Ionicons name="checkmark" size={scale(14)} color="#000" />}
      </View>
      <Text
        className="font-pregular text-gray-700"
        style={{ fontSize: getFontSize(13) }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default Checkbox;
