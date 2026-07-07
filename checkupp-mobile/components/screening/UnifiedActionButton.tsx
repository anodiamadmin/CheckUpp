import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface UnifiedActionButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium" | "large";
}

const UnifiedActionButton: React.FC<UnifiedActionButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  size = "medium",
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: "#FF9C01",
          borderWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 3,
          elevation: 2,
        };
      case "secondary":
        return {
          backgroundColor: "#FFFFFF",
          borderWidth: 1.5,
          borderColor: "#FF9C01",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 2,
          elevation: 1,
        };
      case "outline":
        return {
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#D1D5DB",
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 1,
          elevation: 0,
        };
      case "danger":
        return {
          backgroundColor: "#FEF2F2",
          borderWidth: 1,
          borderColor: "#FECACA",
          shadowColor: "#000",
          shadowOpacity: 0.03,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 1,
          elevation: 0,
        };
      default:
        return {
          backgroundColor: "#FF9C01",
          borderWidth: 0,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 3,
          elevation: 2,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return "#FF9C01";
      case "outline":
        return "#374151";
      case "danger":
        return "#EF4444";
      default:
        return "#FFFFFF";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return "#FFFFFF";
      case "secondary":
        return "#FF9C01";
      case "outline":
        return "#4B5563";
      case "danger":
        return "#EF4444";
      default:
        return "#FFFFFF";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          paddingVertical: getSpacing(6),
          paddingHorizontal: scale(12),
          fontSize: getFontSize(11),
          iconSize: scale(12),
        };
      case "large":
        return {
          paddingVertical: getSpacing(12),
          paddingHorizontal: scale(20),
          fontSize: getFontSize(15),
          iconSize: scale(18),
        };
      case "medium":
      default:
        return {
          paddingVertical: getSpacing(10),
          paddingHorizontal: scale(16),
          fontSize: getFontSize(13),
          iconSize: scale(14),
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles();
  const isIconOnly = !title || title.trim() === "";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={{
        paddingVertical: isIconOnly
          ? sizeStyles.paddingVertical
          : sizeStyles.paddingVertical,
        paddingHorizontal: isIconOnly
          ? sizeStyles.paddingVertical
          : sizeStyles.paddingHorizontal,
        minHeight: scale(40),
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: isDisabled ? 0.5 : 1,
        width: fullWidth ? "100%" : isIconOnly ? scale(40) : undefined,
        ...variantStyles,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={getIconColor()}
              style={{ marginRight: title ? scale(6) : 0 }}
            />
          )}
          {title && (
            <Text
              className="font-psemibold"
              style={{
                fontSize: sizeStyles.fontSize,
                color: getTextColor(),
              }}
            >
              {title}
            </Text>
          )}
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={sizeStyles.iconSize}
              color={getIconColor()}
              style={{ marginLeft: title ? scale(6) : 0 }}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default UnifiedActionButton;
