import React from "react";
import { Text, View, TextInput } from "react-native";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  unit?: string;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  numberOfLines?: number;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  required = false,
  keyboardType = "default",
  multiline = false,
  numberOfLines = 1,
}) => {
  return (
    <View style={{ marginBottom: getSpacing(12) }}>
      <Text
        className="font-pmedium text-gray-700"
        style={{
          fontSize: getFontSize(12),
          marginBottom: getSpacing(4),
        }}
      >
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      <View className="flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          className="flex-1 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
          style={{
            paddingHorizontal: scale(12),
            paddingVertical: getSpacing(10),
            fontSize: getFontSize(13),
            textAlignVertical: multiline ? "top" : "center",
          }}
        />
        {unit && (
          <Text
            className="font-pmedium text-gray-500"
            style={{
              fontSize: getFontSize(12),
              marginLeft: scale(8),
              minWidth: scale(40),
            }}
          >
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
};

export default InputField;
