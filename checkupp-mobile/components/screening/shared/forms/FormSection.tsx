import React from "react";
import { View, Text } from "react-native";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface FormSectionProps {
  title: string;
  backgroundColor: string;
  borderColor: string;
  titleColor: string;
  children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  backgroundColor,
  borderColor,
  titleColor,
  children,
}) => {
  return (
    <View
      className={`${backgroundColor} rounded-lg ${borderColor}`}
      style={{
        padding: scale(12),
        marginBottom: getSpacing(16),
      }}
    >
      <Text
        className={`font-psemibold ${titleColor}`}
        style={{
          fontSize: getFontSize(14),
          marginBottom: getSpacing(10),
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};

export default FormSection;
