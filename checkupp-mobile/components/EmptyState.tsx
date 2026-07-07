import React from "react";
import { router } from "expo-router";
import { images } from "@/constants";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";

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

// Image sizing
const getImageSize = () => {
  if (isVerySmallDevice)
    return { width: scale(180), height: verticalScale(140) };
  if (isSmallDevice) return { width: scale(200), height: verticalScale(155) };
  if (isTablet) return { width: scale(240), height: verticalScale(185) };
  return { width: scale(220), height: verticalScale(170) };
};

interface EmptyStateProps {
  title: string;
  subTitle: string;
  buttonVisible?: boolean;
}

const EmptyState = ({ title, subTitle, buttonVisible }: EmptyStateProps) => {
  const imageSize = getImageSize();

  return (
    <View
      className="justify-center items-center"
      style={{
        paddingHorizontal: scale(16),
        marginTop: getSpacing(16),
      }}
    >
      {/* Illustration */}
      <Image
        source={images.questions}
        style={{
          width: imageSize.width,
          height: imageSize.height,
          marginBottom: getSpacing(12),
        }}
        resizeMode="contain"
      />

      {/* Title */}
      <Text
        className="text-center font-psemibold text-gray-900"
        style={{
          fontSize: getFontSize(18),
          marginBottom: getSpacing(4),
          paddingHorizontal: scale(8),
        }}
      >
        {title}
      </Text>

      {/* Subtitle */}
      <Text
        className="font-pmedium text-gray-500 text-center"
        style={{
          fontSize: getFontSize(12),
          lineHeight: getFontSize(16),
          paddingHorizontal: scale(12),
        }}
      >
        {subTitle}
      </Text>

      {/* Action Button */}
      {buttonVisible && (
        <TouchableOpacity
          onPress={() => router.push("/wallet")}
          className="bg-secondary rounded-lg w-full items-center justify-center"
          style={{
            paddingVertical: getSpacing(10),
            marginTop: getSpacing(16),
          }}
          activeOpacity={0.8}
        >
          <Text
            className="text-black font-psemibold"
            style={{ fontSize: getFontSize(13) }}
          >
            Upload a document
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EmptyState;
