import React from "react";
import { images } from "@/constants";
import CustomButton from "@/components/CustomButton";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import {
  View,
  Text,
  Image,
  Animated,
  TouchableOpacity,
  PixelRatio,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getPostAuthRoute } from "@/lib/auth/profileCompletion";

// Responsive scaling
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const OnboardScreen = () => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const { width, height } = useWindowDimensions();

  const { loading, isLoggedIn, user, profileResolved } = useGlobalContext();

  const constrainedWidth = Math.min(width, 430);
  const constrainedHeight = Math.min(height, 900);
  const scale = (size: number) =>
    (constrainedWidth / guidelineBaseWidth) * size;
  const verticalScale = (size: number) =>
    (constrainedHeight / guidelineBaseHeight) * size;
  const moderateScale = (size: number, factor = 0.3) =>
    size + (scale(size) - size) * factor;
  const pixelRatio = PixelRatio.get();
  const getFontSize = (size: number) => {
    if (pixelRatio >= 3) {
      return moderateScale(size, 0.2);
    }
    if (pixelRatio >= 2) {
      return moderateScale(size, 0.25);
    }
    return moderateScale(size, 0.3);
  };
  const isTablet = width >= 768;
  const isSmallDevice = constrainedWidth < 350 || constrainedHeight < 600;
  const contentMaxWidth = isTablet ? Math.min(width * 0.72, 720) : undefined;
  const contentContainerStyle = {
    width: "100%" as const,
    maxWidth: contentMaxWidth,
    alignSelf: "center" as const,
    paddingHorizontal: isTablet ? 24 : scale(20),
    paddingTop: verticalScale(isSmallDevice ? 8 : 16),
  };
  const skipHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
  const getImageSize = () => {
    if (isTablet) return { width: scale(350), height: scale(260) };
    if (isSmallDevice) return { width: scale(280), height: scale(200) };
    return { width: scale(320), height: scale(230) };
  };

  React.useEffect(() => {
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
  }, [fadeAnim, slideAnim]);

  if (loading || (isLoggedIn && !profileResolved)) {
    return <LoadingSpinner visible text="Loading your profile..." />;
  }

  if (isLoggedIn) {
    return <Redirect href={getPostAuthRoute(user)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="h-full w-full bg-white">
        <View className="flex-1 items-center" style={contentContainerStyle}>
          {/* Top Section - Much more compact */}
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

          {/* Middle Section - Smaller image */}
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

          {/* Bottom Section - All buttons with skip visible */}
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
              containerStyles="w-full rounded-full bg-secondary border border-secondary"
              textStyles="text-black font-pbold text-base"
              rightIcon={
                <Ionicons
                  name="arrow-forward"
                  size={Math.round(scale(16))}
                  color="#111827"
                />
              }
            />

            <CustomButton
              title="I already have an account"
              handlePress={() => router.push("/sign-in" as any)}
              containerStyles="w-full bg-white border border-gray-300 rounded-full"
              textStyles="text-gray-700 font-psemibold text-base"
              leftIcon={
                <Ionicons
                  name="log-in-outline"
                  size={Math.round(scale(16))}
                  color="#6B7280"
                />
              }
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
              title="Continue with Google"
              containerStyles="w-full"
              textStyles="text-gray-700"
            />

            <TouchableOpacity
              onPress={() => router.replace("/" as any)}
              className="flex-row justify-center items-center"
              hitSlop={skipHitSlop}
              style={{
                marginTop: verticalScale(8),
                paddingVertical: verticalScale(12),
                paddingHorizontal: scale(16),
                zIndex: 10,
              }}
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

export default OnboardScreen;
