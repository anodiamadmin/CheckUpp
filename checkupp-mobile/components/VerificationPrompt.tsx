import React from "react";
import { images } from "@/constants";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Image,
  Alert,
  Dimensions,
  PixelRatio,
  TouchableOpacity,
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
    return { width: scale(200), height: verticalScale(200) };
  if (isSmallDevice) return { width: scale(220), height: verticalScale(220) };
  if (isTablet) return { width: scale(280), height: verticalScale(280) };
  return { width: scale(240), height: verticalScale(240) };
};

interface VerificationPromptProps {
  user: any;
  isVerified: boolean;
  sendEmailVerification: (user: any) => Promise<void>;
}

const VerificationPrompt = ({
  user,
  isVerified,
  sendEmailVerification,
}: VerificationPromptProps) => {
  if (isVerified || !user) return null;

  const handleResendVerification = async () => {
    try {
      await sendEmailVerification(user);
      Alert.alert("Success", "Verification email resent.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const imageSize = getImageSize();

  return (
    <SafeAreaView className="flex-1">
      <View
        className="flex-1 justify-center items-center"
        style={{ padding: scale(16) }}
      >
        {/* Header Text */}
        <Text
          className="text-center font-psemibold text-gray-900"
          style={{
            fontSize: getFontSize(18),
            marginBottom: getSpacing(6),
          }}
        >
          A verification link has been sent!
        </Text>

        <Text
          className="text-center font-pregular text-gray-600"
          style={{
            fontSize: getFontSize(13),
            marginBottom: getSpacing(16),
            paddingHorizontal: scale(8),
            lineHeight: getFontSize(18),
          }}
        >
          Please check your email to verify your account.
        </Text>

        {/* Illustration */}
        <Image
          source={images.signup}
          style={{
            width: imageSize.width,
            height: imageSize.height,
            marginBottom: getSpacing(16),
          }}
          resizeMode="contain"
        />

        {/* Footer Text */}
        <Text
          className="text-center font-pregular text-gray-600"
          style={{
            fontSize: getFontSize(12),
            marginBottom: getSpacing(20),
            paddingHorizontal: scale(12),
            lineHeight: getFontSize(16),
          }}
        >
          You will be redirected to the home screen once verified.
        </Text>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleResendVerification}
          className="bg-secondary rounded-lg w-full items-center justify-center"
          style={{
            paddingVertical: getSpacing(12),
            marginTop: getSpacing(4),
          }}
          activeOpacity={0.8}
        >
          <Text
            className="text-black font-psemibold"
            style={{ fontSize: getFontSize(14) }}
          >
            Resend Verification Email
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default VerificationPrompt;
