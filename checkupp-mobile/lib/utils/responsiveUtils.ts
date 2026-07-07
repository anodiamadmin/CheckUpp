import { Dimensions, PixelRatio } from "react-native";

const RESPONSIVE_MAX_WIDTH = 430;
const RESPONSIVE_MAX_HEIGHT = 900;

const getWindowDimensions = () => Dimensions.get("window");

const getResponsiveDimensions = () => {
  const { width, height } = getWindowDimensions();

  return {
    width,
    height,
    effectiveWidth: Math.min(width, RESPONSIVE_MAX_WIDTH),
    effectiveHeight: Math.min(height, RESPONSIVE_MAX_HEIGHT),
  };
};

export const getDeviceFlags = () => {
  const { width, height } = getWindowDimensions();
  return {
    isTablet: width >= 768,
    isSmallDevice: width < 350 || height < 600,
    isVerySmallDevice: width < 320,
  };
};

// Responsive scaling functions
export const scale = (size: number) =>
  (getResponsiveDimensions().effectiveWidth / 350) * size;
export const verticalScale = (size: number) =>
  (getResponsiveDimensions().effectiveHeight / 680) * size;
export const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Device type detection
export const isTablet = getDeviceFlags().isTablet;
export const isSmallDevice = getDeviceFlags().isSmallDevice;
export const isVerySmallDevice = getDeviceFlags().isVerySmallDevice;

// Font sizing with device adaptation
export const getFontSize = (size: number) => {
  const { width } = getResponsiveDimensions();
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Spacing with device adaptation
export const getSpacing = (size: number) => {
  const { isVerySmallDevice, isSmallDevice, isTablet } = getDeviceFlags();
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

// Screen dimensions
export const screenDimensions = {
  get width() {
    return getWindowDimensions().width;
  },
  get height() {
    return getWindowDimensions().height;
  },
};
