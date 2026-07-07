import React, { useEffect, useRef } from "react";
import {
  Modal,
  Animated,
  Text,
  View,
  Dimensions,
  PixelRatio,
  ActivityIndicator,
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

interface LoadingSpinnerProps {
  visible: boolean;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible,
  text,
}) => {
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnimation, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnimation]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={visible}
      statusBarTranslucent={true}
    >
      <Animated.View
        className="flex-1 justify-center items-center"
        style={{
          opacity: fadeAnimation,
        }}
      >
        <View className="items-center justify-center">
          <ActivityIndicator size="large" color="#FF9C01" />

          {text ? (
            <Text
              className="text-gray-900 font-psemibold text-center"
              style={{
                fontSize: getFontSize(13),
                marginTop: getSpacing(10),
              }}
            >
              {text}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default LoadingSpinner;
