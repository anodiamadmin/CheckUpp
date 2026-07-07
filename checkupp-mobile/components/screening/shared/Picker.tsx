import React from "react";
import { Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  getFontSize,
  getSpacing,
  isSmallDevice,
} from "@/lib/utils/responsiveUtils";

interface PickerOption {
  label: string;
  value: string;
}

interface FormPickerProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  required?: boolean;
}

const FormPicker: React.FC<FormPickerProps> = ({
  label,
  value,
  onValueChange,
  options,
  required = false,
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
      <View className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={{ height: isSmallDevice ? 40 : 50 }}
          itemStyle={{ fontSize: getFontSize(14) }}
        >
          {options.map((option) => (
            <Picker.Item
              label={option.label}
              value={option.value}
              key={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};

export default FormPicker;
