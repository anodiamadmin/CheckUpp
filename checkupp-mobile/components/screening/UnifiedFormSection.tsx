import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface UnifiedFormSectionProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  description?: string;
  isLast?: boolean;
}

const UnifiedFormSection: React.FC<UnifiedFormSectionProps> = ({
  title,
  icon,
  children,
  description,
  isLast = false,
}) => {
  return (
    <View
      style={{
        marginBottom: isLast ? 0 : getSpacing(16),
      }}
    >
      {/* Section Header */}
      <View
        className="flex-row items-center bg-[#FFF5E6] rounded-lg"
        style={{
          paddingHorizontal: scale(10),
          paddingVertical: getSpacing(8),
          marginBottom: getSpacing(10),
        }}
      >
        {icon && (
          <View
            className="rounded-lg items-center justify-center"
            style={{
              width: scale(28),
              height: scale(28),
              backgroundColor: "#FFECD1",
              marginRight: scale(8),
            }}
          >
            <Ionicons name={icon} size={scale(14)} color="#FF9C01" />
          </View>
        )}
        <View className="flex-1">
          <Text
            className="font-psemibold text-gray-900"
            style={{ fontSize: getFontSize(13) }}
          >
            {title}
          </Text>
          {description && (
            <Text
              className="font-pregular text-gray-500"
              style={{
                fontSize: getFontSize(10),
                marginTop: getSpacing(1),
              }}
            >
              {description}
            </Text>
          )}
        </View>
      </View>

      {/* Section Content */}
      <View>{children}</View>
    </View>
  );
};

export default UnifiedFormSection;
