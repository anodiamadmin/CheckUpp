import React from "react";
import {
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  PixelRatio,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gender } from "@/app/(tabs)/health-screening";

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

interface RadioProps {
  type: Gender;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onSelect: (type: Gender) => void;
  disabled?: boolean;
}

const Radio: React.FC<RadioProps> = ({
  type,
  icon,
  selected,
  onSelect,
  disabled,
}) => (
  <TouchableOpacity
    onPress={() => !disabled && onSelect(type)}
    disabled={disabled}
    className={`flex-1 items-center justify-center rounded-lg border ${
      selected ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
    } ${disabled ? "opacity-60" : ""}`}
    style={{
      paddingVertical: getSpacing(6),
      paddingHorizontal: scale(6),
      marginHorizontal: scale(2),
    }}
    activeOpacity={0.7}
  >
    <View
      className={`rounded-full items-center justify-center ${
        selected ? "bg-orange-100" : "bg-gray-200"
      }`}
      style={{
        width: scale(32),
        height: scale(32),
        marginBottom: getSpacing(4),
      }}
    >
      <Ionicons
        name={icon}
        size={scale(16)}
        color={selected ? "#FF9C01" : "#6B7280"}
      />
    </View>

    <Text
      className={`text-center font-pmedium capitalize ${
        selected ? "text-orange-700" : "text-gray-700"
      }`}
      style={{ fontSize: getFontSize(10) }}
      numberOfLines={2}
    >
      {type}
    </Text>
  </TouchableOpacity>
);

export default Radio;
