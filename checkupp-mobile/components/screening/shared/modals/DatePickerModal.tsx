import React from "react";
import { Modal, View, Text, TouchableOpacity, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  scale,
  getFontSize,
  getSpacing,
  screenDimensions,
  isSmallDevice,
} from "@/lib/utils/responsiveUtils";

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onValueChange: (date: string) => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  title,
  value,
  onValueChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, index) => currentYear - index);

  return (
    <Modal visible={visible} transparent={true} animationType="slide">
      <View className="flex-1 justify-center items-center bg-black/50">
        <View
          className="bg-white rounded-xl shadow-lg"
          style={{
            padding: scale(16),
            width: screenDimensions.width * 0.8,
          }}
        >
          <Text
            className="font-psemibold text-gray-800 text-center"
            style={{
              fontSize: getFontSize(16),
              marginBottom: getSpacing(12),
            }}
          >
            {title}
          </Text>

          <View className="border border-gray-200 rounded-lg overflow-hidden">
            <Picker
              selectedValue={value.split("-")[0]}
              onValueChange={(year) => {
                const [, month, day] = value.split("-");
                onValueChange(`${year}-${month}-${day}`);
                onClose();
              }}
              style={{
                height: isSmallDevice ? 80 : 100,
              }}
              itemStyle={{
                fontSize: getFontSize(14),
                color: "#1F2937",
              }}
              selectionColor={Platform.OS === "ios" ? "#FF9C01" : undefined}
            >
              {years.map((year) => (
                <Picker.Item
                  label={year.toString()}
                  value={year.toString()}
                  key={year}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="bg-gray-100 rounded-lg items-center justify-center"
            style={{
              paddingVertical: getSpacing(12),
              marginTop: getSpacing(12),
            }}
          >
            <Text
              className="font-pmedium text-gray-600"
              style={{ fontSize: getFontSize(13) }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default DatePickerModal;
