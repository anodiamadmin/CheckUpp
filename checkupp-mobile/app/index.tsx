import React, { useState, useRef, useEffect } from "react";
import { images } from "@/constants";
import { StatusBar } from "expo-status-bar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { Redirect, router } from "expo-router";
import { Text, View, Image, Animated, useWindowDimensions } from "react-native";
import {
  GestureHandlerRootView,
  TouchableOpacity,
} from "react-native-gesture-handler";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { getPostAuthRoute } from "@/lib/auth/profileCompletion";
import "react-native-url-polyfill/auto";

// More compact responsive scaling
const guidelineBaseWidth = 350;

const RootLayout = () => {
  const { loading, isLoggedIn, user, profileResolved } = useGlobalContext();
  const [currentScreen, setCurrentScreen] = useState(0);
  const { width, height } = useWindowDimensions();

  const constrainedWidth = Math.min(width, 430);
  const constrainedHeight = Math.min(height, 900);
  const scale = (size: number) =>
    (constrainedWidth / guidelineBaseWidth) * size;
  const isTablet = width >= 768;
  const isSmallDevice = constrainedWidth < 350 || constrainedHeight < 600;
  const screenMaxWidth = isTablet ? Math.min(width * 0.72, 760) : undefined;
  const screenContainerStyle = {
    width: "100%" as const,
    maxWidth: screenMaxWidth,
    alignSelf: "center" as const,
    paddingHorizontal: isTablet ? 24 : 20,
    paddingTop: isTablet ? 16 : 12,
  };
  const topActionStyle = { zIndex: 10 };
  const skipHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };
  const getImageSize = () => {
    if (isTablet) return { width: scale(280), height: scale(200) };
    if (isSmallDevice) return { width: scale(220), height: scale(150) };
    return { width: scale(250), height: scale(170) };
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: (currentScreen + 1) / 4,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentScreen, fadeAnim, slideAnim, scaleAnim, progressAnim, rotateAnim]);

  const handleNext = () => {
    if (currentScreen < 3) {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.9);
      rotateAnim.setValue(0);
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleSkip = () => {
    router.push("/onboard" as any);
  };

  if (loading) {
    return <LoadingSpinner visible text="Loading your session..." />;
  }

  if (isLoggedIn && !profileResolved) {
    return <LoadingSpinner visible text="Loading your profile..." />;
  }

  if (isLoggedIn) {
    return <Redirect href={getPostAuthRoute(user)} />;
  }

  const ProgressIndicator = ({ currentStep }: { currentStep: number }) => (
    <View className="flex-row justify-center items-center mb-4">
      {[0, 1, 2, 3].map((step) => (
        <View key={step} className="flex-row items-center">
          <Animated.View
            className={`w-2 h-2 rounded-full ${
              step <= currentStep ? "bg-secondary" : "bg-gray-200"
            }`}
            style={{
              transform: [
                {
                  scale:
                    step === currentStep
                      ? fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.2],
                        })
                      : 1,
                },
              ],
            }}
          />
          {step < 3 && (
            <View className="w-6 h-0.5 bg-gray-200 mx-1">
              <Animated.View
                className="h-full bg-secondary"
                style={{
                  width:
                    step < currentStep
                      ? "100%"
                      : progressAnim.interpolate({
                          inputRange: [step / 4, (step + 1) / 4],
                          outputRange: ["0%", "100%"],
                          extrapolate: "clamp",
                        }),
                }}
              />
            </View>
          )}
        </View>
      ))}
    </View>
  );

  // Compact Button Component
  const AnimatedButton = ({
    onPress,
    title,
    variant = "primary",
    icon = null,
    iconPosition = "left",
    className = "",
    style = {},
    textStyle = "",
  }: {
    onPress: () => void;
    title: string;
    variant?: "primary" | "secondary" | "outline";
    icon?: any;
    iconPosition?: "left" | "right";
    className?: string;
    style?: any;
    textStyle?: string;
  }) => {
    const buttonScale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(buttonScale, {
        toValue: 0.95,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    };

    const getButtonStyles = () => {
      switch (variant) {
        case "primary":
          return "bg-secondary";
        case "secondary":
          return "bg-white border-2 border-secondary";
        case "outline":
          return "bg-white/80 border border-gray-300";
        default:
          return "bg-secondary";
      }
    };

    const getTextStyles = () => {
      switch (variant) {
        case "primary":
          return "text-black font-pbold";
        case "secondary":
          return "text-secondary font-psemibold";
        case "outline":
          return "text-gray-700 font-pmedium";
        default:
          return "text-black font-pbold";
      }
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        className={className}
      >
        <Animated.View
          className={`py-3 px-4 rounded-full flex-row items-center justify-center ${getButtonStyles()}`}
          style={{
            transform: [{ scale: buttonScale }],
            shadowColor: variant === "primary" ? "#FF6B35" : "transparent",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: variant === "primary" ? 4 : 0,
            ...style,
          }}
        >
          {icon && iconPosition === "left" && (
            <View className="mr-2">{icon}</View>
          )}
          <Text className={`text-base ${getTextStyles()} ${textStyle}`}>
            {title}
          </Text>
          {icon && iconPosition === "right" && (
            <View className="ml-2">{icon}</View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Welcome Screen
  if (currentScreen === 0) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient colors={["#ffffff", "#f8f8f8"]} style={{ flex: 1 }}>
          <SafeAreaView className="h-full">
            <View className="flex-1" style={screenContainerStyle}>
              <View
                className="flex-row justify-end mb-2"
                style={topActionStyle}
              >
                <TouchableOpacity
                  onPress={handleSkip}
                  className="bg-white/80 px-3 py-1 rounded-full border border-gray-200"
                  hitSlop={skipHitSlop}
                >
                  <Text className="text-gray-600 text-sm font-pmedium">
                    Skip
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Main Content */}
              <View className="flex-1 justify-center items-center px-2">
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                  }}
                  className="items-center w-full"
                >
                  {/* Welcome Title - More compact */}
                  <View className="items-center mb-4">
                    <Text className="font-pbold text-center text-4xl text-gray-900 mb-3">
                      Welcome to
                    </Text>

                    {/* Improved CheckUpp logo design */}
                    <View className="relative">
                      {/* Background glow effect */}
                      <View
                        className="absolute inset-0 bg-orange-400/20 rounded-3xl"
                        style={{
                          transform: [{ scale: 1.1 }],
                        }}
                      />

                      {/* Main logo container */}
                      <LinearGradient
                        colors={["#FF9C01", "#FFB84D", "#FF7B02"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="px-8 py-3 rounded-full relative"
                        style={{
                          shadowColor: "#FF9C01",
                          shadowOffset: { width: 0, height: 8 },
                          shadowOpacity: 0.3,
                          shadowRadius: 12,
                          elevation: 8,
                        }}
                      >
                        <Text className="text-3xl font-pextrabold text-white text-center tracking-wide">
                          Check
                          <Text className="text-yellow-100">Upp</Text>
                        </Text>

                        {/* Small decorative elements */}
                        <View className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full opacity-80" />
                        <View className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-200 rounded-full opacity-60" />
                      </LinearGradient>
                    </View>
                  </View>

                  <Animated.View
                    style={{
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    }}
                    className="mb-4"
                  >
                    <Image
                      source={images.landing}
                      style={getImageSize()}
                      resizeMode="contain"
                    />
                  </Animated.View>

                  <Text className="text-sm font-pregular text-gray-600 text-center leading-relaxed max-w-xs mb-4">
                    Your personal health companion for regular check-ups and
                    preventive care with your GP and primary care providers
                  </Text>

                  <View className="items-center gap-2 mb-4">
                    <View className="flex-row gap-2">
                      {[
                        {
                          icon: "calendar-heart",
                          title: "Smart Reminders",
                          color: "#FF9C01",
                        },
                        {
                          icon: "shield-check",
                          title: "AU Guidelines",
                          color: "#00CED1",
                        },
                      ].map((benefit, index) => (
                        <Animated.View
                          key={benefit.title}
                          style={{
                            opacity: fadeAnim,
                            transform: [
                              {
                                translateY: slideAnim.interpolate({
                                  inputRange: [0, 50],
                                  outputRange: [0, 20 + index * 5],
                                }),
                              },
                            ],
                          }}
                          className="flex-row items-center bg-white px-2 py-1.5 rounded-full border border-gray-100"
                        >
                          <MaterialCommunityIcons
                            name={benefit.icon as any}
                            size={14}
                            color={benefit.color}
                          />
                          <Text className="text-gray-700 font-pmedium text-xs ml-1.5">
                            {benefit.title}
                          </Text>
                        </Animated.View>
                      ))}
                    </View>

                    <Animated.View
                      style={{
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: slideAnim.interpolate({
                              inputRange: [0, 50],
                              outputRange: [0, 30],
                            }),
                          },
                        ],
                      }}
                      className="flex-row items-center bg-white px-2 py-1.5 rounded-full border border-gray-100"
                    >
                      <MaterialCommunityIcons
                        name="account-heart"
                        size={14}
                        color="#10B981"
                      />
                      <Text className="text-gray-700 font-pmedium text-xs ml-1.5">
                        Personalized Care
                      </Text>
                    </Animated.View>
                  </View>
                </Animated.View>
              </View>

              {/* Bottom Section */}
              <View className="pb-5">
                <ProgressIndicator currentStep={currentScreen} />
                <AnimatedButton
                  onPress={handleNext}
                  title="Begin Your Health Journey"
                  iconPosition="right"
                  textStyle="text-base"
                  icon={
                    <Ionicons name="arrow-forward" size={18} color="black" />
                  }
                  className="w-full"
                  style={{
                    backgroundColor: "#FF9C01",
                    shadowColor: "#FF9C01",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                />
              </View>
            </View>
            <StatusBar backgroundColor="transparent" style="dark" />
          </SafeAreaView>
        </LinearGradient>
        <LoadingSpinner visible={loading} />
      </GestureHandlerRootView>
    );
  }

  if (currentScreen === 1) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient colors={["#ffffff", "#fcf7f4"]} style={{ flex: 1 }}>
          <SafeAreaView className="h-full">
            <View className="flex-1" style={screenContainerStyle}>
              {/* Skip Button */}
              <View
                className="flex-row justify-end mb-2"
                style={topActionStyle}
              >
                <TouchableOpacity
                  onPress={handleSkip}
                  className="bg-white/70 px-3 py-1.5 rounded-full"
                  hitSlop={skipHitSlop}
                >
                  <Text className="text-gray-500 font-pmedium text-sm">
                    Skip
                  </Text>
                </TouchableOpacity>
              </View>

              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
                className="flex-1 justify-center"
              >
                {/* Header - more compact */}
                <View className="mb-6 items-center">
                  <Text className="font-pbold text-2xl text-gray-900 text-center mb-2">
                    Visit Frequency
                  </Text>
                  <Text className="text-gray-600 font-pregular text-center text-sm max-w-xs">
                    Based on Australian health recommendations
                  </Text>
                </View>

                {/* Visit Frequency Card */}
                <Animated.View
                  className="bg-white p-4 rounded-2xl border border-gray-100 mb-6"
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, -30],
                        }),
                      },
                    ],
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <LinearGradient
                      colors={["#e6f7ff", "#ccefff"]}
                      className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
                    >
                      <MaterialCommunityIcons
                        name="account-clock"
                        size={16}
                        color="#0284c7"
                      />
                    </LinearGradient>
                    <Text className="font-pbold text-gray-900 text-base">
                      How Often Should You Visit?
                    </Text>
                  </View>

                  <View className="space-y-3">
                    <View className="flex-row items-start bg-blue-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-2.5">
                        <Text className="font-pbold text-blue-600 text-xs">
                          1
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Younger adults
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Every 2-3 years for general check-ups
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start bg-orange-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-orange-100 rounded-full items-center justify-center mr-2.5">
                        <Text className="font-pbold text-orange-600 text-xs">
                          2
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Ages 45+
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Every year for comprehensive health assessment
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start bg-red-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-red-100 rounded-full items-center justify-center mr-2.5">
                        <Text className="font-pbold text-red-600 text-xs">
                          3
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Medical conditions
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Every 6-12 months for monitoring and management
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {/* Note */}
                <Animated.View
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 30],
                        }),
                      },
                    ],
                  }}
                  className="bg-secondary/10 p-3 rounded-xl border border-secondary/20 mb-3"
                >
                  <View className="flex-row">
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color="#FF6B35"
                      style={{ marginRight: 6, marginTop: 2 }}
                    />
                    <Text className="text-gray-700 font-pregular flex-1 text-xs">
                      Regular check-ups help detect health issues early and give
                      you the best chance for effective treatment.
                    </Text>
                  </View>
                </Animated.View>
              </Animated.View>

              {/* Bottom Section */}
              <View className="pb-5">
                <ProgressIndicator currentStep={currentScreen} />
                <View className="flex-row justify-between space-x-2">
                  <AnimatedButton
                    onPress={() => setCurrentScreen(0)}
                    title="Back"
                    variant="outline"
                    icon={
                      <Ionicons name="chevron-back" size={16} color="black" />
                    }
                    iconPosition="left"
                    className="flex-1"
                    textStyle="text-black text-sm font-pmedium"
                  />
                  <AnimatedButton
                    onPress={handleNext}
                    title="Continue"
                    icon={
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="black"
                      />
                    }
                    iconPosition="right"
                    className="flex-1"
                    style={{
                      backgroundColor: "#FF6B35",
                    }}
                    textStyle="text-black text-sm font-pmedium"
                  />
                </View>
              </View>
            </View>
            <StatusBar backgroundColor="transparent" style="dark" />
          </SafeAreaView>
        </LinearGradient>
        <LoadingSpinner visible={loading} />
      </GestureHandlerRootView>
    );
  }

  if (currentScreen === 2) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient colors={["#ffffff", "#fcf7f4"]} style={{ flex: 1 }}>
          <SafeAreaView className="h-full">
            <View className="flex-1" style={screenContainerStyle}>
              {/* Skip Button */}
              <View
                className="flex-row justify-end mb-2"
                style={topActionStyle}
              >
                <TouchableOpacity
                  onPress={handleSkip}
                  className="bg-white/70 px-3 py-1.5 rounded-full"
                  hitSlop={skipHitSlop}
                >
                  <Text className="text-gray-500 font-pmedium text-sm">
                    Skip
                  </Text>
                </TouchableOpacity>
              </View>

              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
                className="flex-1 justify-center"
              >
                {/* Header */}
                <View className="mb-6 items-center">
                  <Text className="font-pbold text-2xl text-gray-900 text-center mb-2">
                    What We Cover
                  </Text>
                  <Text className="text-gray-600 font-pregular text-center text-sm max-w-xs">
                    Comprehensive health screenings for your well-being
                  </Text>
                </View>

                {/* What We Cover Card */}
                <Animated.View
                  className="bg-white p-4 rounded-2xl border border-gray-100 mb-5"
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 30],
                        }),
                      },
                    ],
                  }}
                >
                  <View className="flex-row items-center mb-3">
                    <LinearGradient
                      colors={["#dcfce7", "#bbf7d0"]}
                      className="w-8 h-8 rounded-xl items-center justify-center mr-2.5"
                    >
                      <MaterialCommunityIcons
                        name="clipboard-check"
                        size={16}
                        color="#059669"
                      />
                    </LinearGradient>
                    <Text className="font-pbold text-gray-900 text-base">
                      Our Screening Services
                    </Text>
                  </View>

                  <View className="space-y-2.5">
                    <View className="flex-row items-start bg-rose-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-rose-100 rounded-full items-center justify-center mr-2.5">
                        <MaterialCommunityIcons
                          name="bacteria-outline"
                          size={14}
                          color="#e11d48"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Cancer Screenings
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Cervical, Breast, Bowel, Prostate, Lung
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start bg-blue-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-blue-100 rounded-full items-center justify-center mr-2.5">
                        <MaterialCommunityIcons
                          name="heart-pulse"
                          size={14}
                          color="#2563eb"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Health Checks
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Heart, Diabetes, Vision, Dental, Mental Health
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-start bg-purple-50 p-2.5 rounded-xl">
                      <View className="w-6 h-6 bg-purple-100 rounded-full items-center justify-center mr-2.5">
                        <MaterialCommunityIcons
                          name="bell-ring-outline"
                          size={14}
                          color="#9333ea"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-psemibold text-sm">
                          Personalized Reminders
                        </Text>
                        <Text className="text-gray-600 font-pregular text-xs">
                          Based on your age, gender, and health profile
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>

                {/* Emergency Contact */}
                <Animated.View
                  className="bg-red-50 p-3 rounded-xl border border-red-200"
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 20],
                        }),
                      },
                    ],
                  }}
                >
                  <View className="flex-row items-center">
                    <View className="w-6 h-6 bg-red-200/80 rounded-full items-center justify-center mr-2.5">
                      <MaterialCommunityIcons
                        name="phone"
                        size={14}
                        color="#dc2626"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="font-pbold text-red-600 text-sm">
                        Emergency: 112
                      </Text>
                      <Text className="text-red-700 font-pmedium text-xs">
                        For medical emergencies, call 112 immediately
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>

              {/* Bottom Section */}
              <View className="pb-5">
                <ProgressIndicator currentStep={currentScreen} />
                <View className="flex-row justify-between space-x-2">
                  <AnimatedButton
                    onPress={() => setCurrentScreen(1)}
                    title="Back"
                    variant="outline"
                    icon={
                      <Ionicons name="chevron-back" size={16} color="black" />
                    }
                    iconPosition="left"
                    className="flex-1"
                    textStyle="text-black text-sm font-pmedium"
                  />
                  <AnimatedButton
                    onPress={handleNext}
                    title="Continue"
                    icon={
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="black"
                      />
                    }
                    iconPosition="right"
                    className="flex-1"
                    style={{
                      backgroundColor: "#FF6B35",
                    }}
                    textStyle="text-black text-sm font-pmedium"
                  />
                </View>
              </View>
            </View>
            <StatusBar backgroundColor="transparent" style="dark" />
          </SafeAreaView>
        </LinearGradient>
        <LoadingSpinner visible={loading} />
      </GestureHandlerRootView>
    );
  }

  // Ready to Start Screen
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={["#ffffff", "#fcf7f4"]} style={{ flex: 1 }}>
        <SafeAreaView className="h-full">
          <View className="flex-1" style={screenContainerStyle}>
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
              className="flex-1 justify-center items-center"
            >
              {/* Ready to Start Message */}
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: scaleAnim.interpolate({
                        inputRange: [0.9, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                }}
                className="mb-6 items-center"
              >
                <LinearGradient
                  colors={["#dcfce7", "#bbf7d0"]}
                  className="w-12 h-12 rounded-full items-center justify-center mb-3"
                >
                  <MaterialCommunityIcons
                    name="check"
                    size={24}
                    color="#059669"
                  />
                </LinearGradient>

                <Text className="font-pbold text-2xl text-gray-900 text-center mb-2">
                  Ready to Start!
                </Text>

                <Text className="text-sm font-pregular text-gray-600 text-center leading-relaxed max-w-xs">
                  Let&apos;s set up your personalized health screening schedule
                </Text>
              </Animated.View>

              {/* Next Steps Preview */}
              <View className="w-full space-y-2.5 mb-5">
                {[
                  {
                    step: "1",
                    title: "Enter Your Details",
                    description: "Quick profile setup for personalized care",
                    color: "blue",
                    iconName: "account-edit",
                  },
                  {
                    step: "2",
                    title: "View Your Screenings",
                    description: "See which health checks apply to you",
                    color: "purple",
                    iconName: "clipboard-list",
                  },
                  {
                    step: "3",
                    title: "Set Reminders",
                    description: "Never miss important appointments",
                    color: "green",
                    iconName: "bell-ring",
                  },
                ].map((item, index) => (
                  <Animated.View
                    key={item.title}
                    style={{
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateX: slideAnim.interpolate({
                            inputRange: [0, 50],
                            outputRange: [0, index % 2 === 0 ? -30 : 30],
                          }),
                        },
                      ],
                    }}
                    className="flex-row items-center bg-white p-3 rounded-xl border border-gray-100"
                  >
                    <LinearGradient
                      colors={[
                        item.color === "blue"
                          ? "#e0f2fe"
                          : item.color === "purple"
                            ? "#f3e8ff"
                            : "#dcfce7",
                        item.color === "blue"
                          ? "#bae6fd"
                          : item.color === "purple"
                            ? "#e9d5ff"
                            : "#bbf7d0",
                      ]}
                      className="w-8 h-8 rounded-full items-center justify-center mr-2.5"
                    >
                      <MaterialCommunityIcons
                        name={item.iconName as any}
                        size={16}
                        color={
                          item.color === "blue"
                            ? "#0284c7"
                            : item.color === "purple"
                              ? "#9333ea"
                              : "#059669"
                        }
                      />
                    </LinearGradient>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-psemibold text-sm">
                        {item.title}
                      </Text>
                      <Text className="text-gray-600 font-pregular text-xs">
                        {item.description}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>

              {/* Important Note */}
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, 20],
                      }),
                    },
                  ],
                }}
                className="bg-secondary/10 p-3 rounded-xl border border-secondary/20 mb-3 w-full"
              >
                <View className="flex-row items-start">
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={16}
                    color="#FF6B35"
                    style={{ marginRight: 6, marginTop: 2 }}
                  />
                  <Text className="text-gray-700 font-pregular flex-1 text-xs">
                    Your data is securely stored and used only to provide
                    personalized health recommendations.
                  </Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Bottom Section */}
            <View className="pb-5">
              <ProgressIndicator currentStep={currentScreen} />
              <View className="flex-row justify-between space-x-2">
                <AnimatedButton
                  onPress={() => setCurrentScreen(2)}
                  title="Back"
                  variant="outline"
                  icon={
                    <Ionicons name="chevron-back" size={16} color="black" />
                  }
                  iconPosition="left"
                  className="flex-1"
                  textStyle="text-black text-sm font-pmedium"
                />
                <AnimatedButton
                  onPress={() => router.push("/onboard" as any)}
                  title="Let's Go!"
                  icon={
                    <Ionicons name="chevron-forward" size={16} color="black" />
                  }
                  iconPosition="right"
                  className="flex-1"
                  style={{
                    backgroundColor: "#FF6B35",
                  }}
                  textStyle="text-black text-sm font-pmedium"
                />
              </View>
            </View>
          </View>
          <StatusBar backgroundColor="transparent" style="dark" />
        </SafeAreaView>
      </LinearGradient>
      <LoadingSpinner visible={loading} />
    </GestureHandlerRootView>
  );
};

export default RootLayout;
