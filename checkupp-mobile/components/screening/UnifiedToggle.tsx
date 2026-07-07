import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface UnifiedToggleOption {
  label: string;
  value: string | boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface UnifiedToggleProps {
  label?: string;
  options: UnifiedToggleOption[];
  selectedValue: string | boolean;
  onSelect: (value: string | boolean) => void;
  required?: boolean;
  error?: string;
}

const UnifiedToggle: React.FC<UnifiedToggleProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  required = false,
  error,
}) => {
  return (
    <View style={{ marginBottom: getSpacing(12) }}>
      {/* Label */}
      {label && (
        <View
          className="flex-row items-center"
          style={{ marginBottom: getSpacing(8) }}
        >
          <Text
            className="font-pmedium text-gray-700"
            style={{ fontSize: getFontSize(12) }}
          >
            {label}
            {required && <Text className="text-[#FF9C01]"> *</Text>}
          </Text>
        </View>
      )}

      {/* Toggle Options */}
      <View
        className="flex-row flex-wrap"
        style={{ gap: scale(8), marginHorizontal: -scale(2) }}
      >
        {options.map((option, index) => {
          const isSelected = option.value === selectedValue;
          return (
            <TouchableOpacity
              key={index}
              onPress={() => {
                console.log("Toggle pressed:", option.label, option.value);
                onSelect(option.value);
              }}
              activeOpacity={0.6}
              className={`flex-1 rounded-lg border ${
                isSelected
                  ? "bg-[#FFF5E6] border-[#FF9C01]"
                  : "bg-white border-gray-200"
              }`}
              style={{
                paddingHorizontal: scale(8),
                paddingVertical: getSpacing(12),
                minWidth: scale(80),
                shadowColor: isSelected ? "#FF9C01" : "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isSelected ? 0.15 : 0.05,
                shadowRadius: 2,
                elevation: isSelected ? 2 : 1,
              }}
            >
              {/* Check Icon - positioned relative to TouchableOpacity */}
              {isSelected && (
                <View
                  className="absolute bg-[#FF9C01] rounded-full"
                  style={{
                    top: scale(6),
                    right: scale(6),
                    width: scale(16),
                    height: scale(16),
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  <Ionicons name="checkmark" size={scale(10)} color="#ffffff" />
                </View>
              )}

              <View className="items-center">
                {/* Icon */}
                {option.icon && (
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: scale(32),
                      height: scale(32),
                      backgroundColor: isSelected ? "#FFECD1" : "#F5F5F5",
                      marginBottom: getSpacing(5),
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={scale(16)}
                      color={isSelected ? "#FF9C01" : "#64748b"}
                    />
                  </View>
                )}

                {/* Label */}
                <Text
                  className={`font-pmedium text-center ${
                    isSelected ? "text-[#FF9C01]" : "text-gray-700"
                  }`}
                  style={{ fontSize: getFontSize(12) }}
                  numberOfLines={2}
                >
                  {option.label}
                </Text>

                {/* Description */}
                {option.description && (
                  <Text
                    className="font-pregular text-gray-500 text-center"
                    style={{
                      fontSize: getFontSize(9),
                      marginTop: getSpacing(3),
                    }}
                    numberOfLines={2}
                  >
                    {option.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Error Message */}
      {error && (
        <View
          className="flex-row items-center"
          style={{ marginTop: getSpacing(5) }}
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
    </View>
  );
};

export default UnifiedToggle;
