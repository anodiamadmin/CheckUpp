import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface ValidationStatus {
  isNormal: boolean;
  issues: string[];
}

interface ValidationSummaryProps {
  validation: ValidationStatus;
  normalMessage: string;
  issueMessage: string;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  validation,
  normalMessage,
  issueMessage,
}) => {
  return (
    <View
      className={`rounded-lg border ${
        validation.isNormal
          ? "bg-green-50 border-green-100"
          : "bg-orange-50 border-orange-100"
      }`}
      style={{
        padding: scale(12),
        marginBottom: getSpacing(16),
      }}
    >
      <View className="flex-row items-center">
        <Ionicons
          name={validation.isNormal ? "checkmark-circle" : "warning"}
          size={scale(16)}
          color={validation.isNormal ? "#22c55e" : "#f59e0b"}
        />
        <Text
          className={`font-psemibold ${
            validation.isNormal ? "text-green-800" : "text-orange-800"
          }`}
          style={{
            fontSize: getFontSize(12),
            marginLeft: scale(6),
          }}
        >
          {validation.isNormal ? normalMessage : issueMessage}
        </Text>
      </View>
      {!validation.isNormal && (
        <Text
          className="font-pregular text-orange-700"
          style={{
            fontSize: getFontSize(11),
            marginTop: getSpacing(4),
            marginLeft: scale(22),
          }}
        >
          {validation.issues.join(", ")}
        </Text>
      )}
    </View>
  );
};

export default ValidationSummary;
