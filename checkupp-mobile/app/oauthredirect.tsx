import { images } from "@/constants";
import { Redirect, router } from "expo-router";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useRef, useEffect } from "react";
import { getPostAuthRoute } from "@/lib/auth/profileCompletion";
import {
  View,
  Text,
  Image,
  Animated,
  PixelRatio,
  Dimensions,
  TouchableOpacity,
} from "react-native";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.3) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (pixelRatio >= 3) {
    return moderateScale(size, 0.2);
  } else if (pixelRatio >= 2) {
    return moderateScale(size, 0.25);
  }
  return moderateScale(size, 0.3);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;

// Image sizes
const getImageSize = () => {
  if (isTablet) return { width: scale(350), height: scale(260) };
  if (isSmallDevice) return { width: scale(280), height: scale(200) };
  return { width: scale(320), height: scale(230) };
};

const OauthRedirect = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { loading, isLoggedIn, user, profileResolved } = useGlobalContext();
  const { showToast } = useToast();

  // Only show the toast once on mount
  useEffect(() => {
    showToast("Please wait while we log you in...", "info");

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, showToast, slideAnim]);

  if (loading || (isLoggedIn && !profileResolved)) {
    // Loading spinner while redirecting
    return <LoadingSpinner visible text="Loading your profile..." />;
  }

  if (isLoggedIn) {
    return <Redirect href={getPostAuthRoute(user)} />;
  }

  return (
    <GestureHandlerRootView>
      <SafeAreaView className="h-full w-full bg-white">
        <View
          className="flex-1 items-center"
          style={{
            paddingHorizontal: scale(20),
            paddingTop: verticalScale(isSmallDevice ? 8 : 16),
          }}
        >
          {/* Top Section */}
          <View
            className="w-full items-center"
            style={{ marginBottom: verticalScale(isSmallDevice ? 12 : 20) }}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              <Text
                className="font-pmedium text-center"
                style={{ fontSize: getFontSize(isTablet ? 42 : 32) }}
              >
                Welcome to{" "}
                <Text className="text-secondary font-pbold">CheckUpp</Text>
              </Text>
              <Text
                className="text-gray-500 font-pregular text-center"
                style={{
                  fontSize: getFontSize(16),
                  marginTop: verticalScale(4),
                }}
              >
                Your health companion for better living
              </Text>
            </Animated.View>
          </View>

          {/* Middle Section */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              marginBottom: verticalScale(isSmallDevice ? 16 : 24),
            }}
            className="w-full items-center"
          >
            <Image
              source={images.welcome}
              style={getImageSize()}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Bottom Section */}
          <View
            className="w-full"
            style={{
              flex: 1,
              justifyContent: "flex-end",
              paddingBottom: verticalScale(20),
              gap: verticalScale(8),
            }}
          >
            <CustomButton
              title="Get Started"
              handlePress={() => router.push("/sign-up" as any)}
              containerStyles="w-full rounded-full bg-secondary shadow-sm shadow-secondary/50"
              textStyles="text-black font-pbold text-lg"
              disabled
            />

            <CustomButton
              title="I already have an account"
              handlePress={() => router.push("/sign-in" as any)}
              containerStyles="w-full bg-white border-2 border-secondary rounded-full"
              textStyles="text-secondary font-psemibold"
              disabled
            />

            <View
              className="flex-row items-center"
              style={{ marginVertical: verticalScale(6) }}
            >
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text
                className="font-pregular text-gray-500"
                style={{
                  fontSize: getFontSize(12),
                  marginHorizontal: scale(12),
                }}
              >
                or continue with
              </Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>

            <GoogleLoginButton
              containerStyles="border border-gray-300 w-full rounded-full shadow-sm"
              disabled
            />

            <TouchableOpacity
              onPress={() => {}}
              className="flex-row justify-center items-center"
              style={{
                marginTop: verticalScale(8),
                paddingVertical: verticalScale(12),
                paddingHorizontal: scale(16),
                opacity: 0.5,
              }}
              disabled={true}
              activeOpacity={1}
            >
              <Text
                className="text-secondary font-psemibold underline"
                style={{ fontSize: getFontSize(14) }}
              >
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default OauthRedirect;
