import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface UnifiedValidationSummaryProps {
  errors: string[];
  warnings?: string[];
  showIcon?: boolean;
}

const UnifiedValidationSummary: React.FC<UnifiedValidationSummaryProps> = ({
  errors,
  warnings = [],
  showIcon = true,
}) => {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <View style={{ marginBottom: getSpacing(12) }}>
      {/* Errors */}
      {hasErrors && (
        <View
          className="bg-red-50 border border-red-200 rounded-lg"
          style={{
            padding: scale(10),
            marginBottom: hasWarnings ? getSpacing(10) : 0,
          }}
        >
          <View
            className="flex-row items-center"
            style={{ marginBottom: errors.length > 1 ? getSpacing(6) : 0 }}
          >
            {showIcon && (
              <Ionicons
                name="alert-circle"
                size={scale(14)}
                color="#ef4444"
                style={{ marginRight: scale(6) }}
              />
            )}
            <Text
              className="font-psemibold text-red-700"
              style={{ fontSize: getFontSize(12) }}
            >
              {errors.length === 1
                ? "Issue Found"
                : `${errors.length} Issues Found`}
            </Text>
          </View>

          {errors.map((error, index) => (
            <View
              key={index}
              className="flex-row items-start"
              style={{
                marginTop: index > 0 ? getSpacing(4) : 0,
                paddingLeft: showIcon ? scale(20) : 0,
              }}
            >
              <View
                className="bg-red-400 rounded-full"
                style={{
                  width: scale(5),
                  height: scale(5),
                  marginTop: scale(4),
                  marginRight: scale(6),
                }}
              />
              <Text
                className="font-pregular text-red-700 flex-1"
                style={{
                  fontSize: getFontSize(11),
                  lineHeight: getFontSize(15),
                }}
              >
                {error}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <View
          className="bg-orange-50 border border-orange-200 rounded-lg"
          style={{
            padding: scale(10),
          }}
        >
          <View
            className="flex-row items-center"
            style={{ marginBottom: warnings.length > 1 ? getSpacing(6) : 0 }}
          >
            {showIcon && (
              <Ionicons
                name="warning"
                size={scale(14)}
                color="#FF9C01"
                style={{ marginRight: scale(6) }}
              />
            )}
            <Text
              className="font-psemibold"
              style={{ fontSize: getFontSize(12), color: "#FF9C01" }}
            >
              {warnings.length === 1 ? "Note" : `${warnings.length} Notes`}
            </Text>
          </View>

          {warnings.map((warning, index) => (
            <View
              key={index}
              className="flex-row items-start"
              style={{
                marginTop: index > 0 ? getSpacing(4) : 0,
                paddingLeft: showIcon ? scale(20) : 0,
              }}
            >
              <View
                className="rounded-full"
                style={{
                  width: scale(5),
                  height: scale(5),
                  marginTop: scale(4),
                  marginRight: scale(6),
                  backgroundColor: "#FF9C01",
                }}
              />
              <Text
                className="font-pregular flex-1"
                style={{
                  fontSize: getFontSize(11),
                  lineHeight: getFontSize(15),
                  color: "#ea580c",
                }}
              >
                {warning}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default UnifiedValidationSummary;
