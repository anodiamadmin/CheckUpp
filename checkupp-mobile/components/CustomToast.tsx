import React from "react";
import { View, Text, Animated, Dimensions, PixelRatio } from "react-native";
import { ToastConfigParams } from "react-native-toast-message";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useColorScheme } from "nativewind";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

// Responsive spacing
const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

const CustomToast: React.FC<ToastConfigParams<any>> = ({
  text1,
  text2,
  type,
}) => {
  const { colorScheme } = useColorScheme();
  const iconSize = scale(16);
  const shadowColor =
    colorScheme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  const getConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "check-circle",
          iconColor: "#10b981",
          bg: "bg-emerald-50",
          border: "border-emerald-100",
          textColor: "text-emerald-800",
        };
      case "error":
        return {
          icon: "close-circle",
          iconColor: "#ef4444",
          bg: "bg-red-50",
          border: "border-red-100",
          textColor: "text-red-800",
        };
      case "info":
      default:
        return {
          icon: "information",
          iconColor: "#3b82f6",
          bg: "bg-blue-50",
          border: "border-blue-100",
          textColor: "text-blue-800",
        };
    }
  };

  const { icon, iconColor, bg, border, textColor } = getConfig();

  return (
    <Animated.View
      className={`flex-row items-center rounded-lg border ${bg} ${border}`}
      style={{
        paddingHorizontal: scale(10),
        paddingVertical: getSpacing(6),
        width: "95%",
        minHeight: verticalScale(
          isVerySmallDevice ? 36 : isSmallDevice ? 40 : 44
        ),
        marginBottom: getSpacing(4),
        marginHorizontal: scale(4),
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
      }}
    >
      <View style={{ marginRight: scale(8) }}>
        <MaterialCommunityIcons
          name={icon as any}
          size={iconSize}
          color={iconColor}
        />
      </View>

      <View className="flex-1">
        <Text
          className={`font-psemibold ${textColor}`}
          style={{
            fontSize: getFontSize(11),
            marginBottom: text2 ? getSpacing(1) : 0,
          }}
          numberOfLines={1}
        >
          {text1}
        </Text>
        {text2 && (
          <Text
            className={`font-pregular ${textColor} opacity-80`}
            style={{
              fontSize: getFontSize(9),
              lineHeight: getFontSize(13),
            }}
            numberOfLines={2}
          >
            {text2}
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

export default CustomToast;
