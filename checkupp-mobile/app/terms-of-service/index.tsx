import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  PixelRatio,
  Platform,
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

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const extraPadding = getSpacing(24);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

const PolicySection = ({ icon, title, children, isLast = false }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    Animated.timing(animation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotateIcon = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      className="bg-white rounded-lg border border-gray-100"
      style={{
        marginBottom: isLast ? getSpacing(16) : getSpacing(8),
      }}
    >
      <TouchableOpacity
        onPress={toggleExpand}
        className="flex-row items-center justify-between"
        style={{ padding: scale(10) }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <View
            className="rounded-full bg-orange-50 items-center justify-center"
            style={{
              width: scale(28),
              height: scale(28),
            }}
          >
            <Ionicons name={icon} size={scale(14)} color="#FF9C01" />
          </View>
          <Text
            className="font-pmedium text-gray-900 flex-1"
            style={{
              fontSize: getFontSize(13),
              marginLeft: scale(8),
            }}
          >
            {title}
          </Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
          <Ionicons name="chevron-down" size={scale(14)} color="#9CA3AF" />
        </Animated.View>
      </TouchableOpacity>

      {expanded && (
        <View
          style={{ paddingHorizontal: scale(10), paddingBottom: scale(10) }}
        >
          <View
            className="bg-gray-100"
            style={{
              width: "100%",
              height: 1,
              marginBottom: getSpacing(8),
            }}
          />
          {children}
        </View>
      )}
    </View>
  );
};

const TermsOfService = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={["#ffffff", "#f8f8f8"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          {/* Compact Header */}
          <View
            style={{
              paddingHorizontal: scale(12),
              paddingVertical: getSpacing(8),
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={scale(18)}
                  color="#FF9C01"
                />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <Text
                  className="font-psemibold text-gray-800"
                  style={{ fontSize: getFontSize(18) }}
                >
                  Terms of Service
                </Text>
              </View>

              <TouchableOpacity
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="document-text"
                  size={scale(16)}
                  color="#FF9C01"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content Card */}
          <View
            className="flex-1 bg-white rounded-3xl overflow-hidden shadow-md"
            style={{ marginHorizontal: scale(12) }}
          >
            <View
              className="flex-row justify-between items-center"
              style={{
                paddingHorizontal: scale(16),
                paddingTop: getSpacing(16),
                paddingBottom: getSpacing(8),
              }}
            >
              <Text
                className="font-psemibold text-gray-800"
                style={{ fontSize: getFontSize(16) }}
              >
                Legal Terms & Conditions
              </Text>
            </View>

            <ScrollView
              className="flex-1"
              style={{ paddingHorizontal: scale(12) }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: getTabBarSafeBottomPadding(),
              }}
            >
              <PolicySection icon="document-text" title="Introduction">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  Welcome to CheckUpp Health Passport. By using our app, you
                  agree to comply with these Terms of Service, which outline the
                  rules and regulations for using our platform.
                </Text>
              </PolicySection>

              <PolicySection icon="person-circle" title="User Responsibilities">
                <View style={{ gap: getSpacing(4) }}>
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    As a user of CheckUpp Health Passport, you agree to:
                  </Text>
                  <View
                    className="bg-orange-50 rounded-lg"
                    style={{ padding: scale(8) }}
                  >
                    <Text
                      className="text-gray-700 font-pregular"
                      style={{
                        fontSize: getFontSize(10),
                        lineHeight: getFontSize(14),
                      }}
                    >
                      • Provide accurate registration information{"\n"}•
                      Maintain account security{"\n"}• Comply with applicable
                      laws{"\n"}• Report unauthorized access{"\n"}• Use for
                      legitimate healthcare purposes
                    </Text>
                  </View>
                </View>
              </PolicySection>

              <PolicySection icon="warning" title="Prohibited Activities">
                <View style={{ gap: getSpacing(4) }}>
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    The following activities are strictly prohibited:
                  </Text>
                  <View
                    className="bg-red-50 rounded-lg border border-red-200"
                    style={{ padding: scale(8) }}
                  >
                    <Text
                      className="text-gray-700 font-pregular"
                      style={{
                        fontSize: getFontSize(10),
                        lineHeight: getFontSize(14),
                      }}
                    >
                      • Reverse engineering or hacking attempts{"\n"}•
                      Distributing malicious content{"\n"}• Unauthorized medical
                      diagnosis{"\n"}• Violating intellectual property{"\n"}•
                      Sharing account access
                    </Text>
                  </View>
                </View>
              </PolicySection>

              <PolicySection
                icon="shield-checkmark"
                title="Data Usage & Privacy"
              >
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  Your data usage and privacy are governed by our comprehensive
                  Privacy Policy. We employ enterprise-grade encryption and
                  strict access controls to protect your sensitive health
                  information.
                </Text>
              </PolicySection>

              <PolicySection icon="close-circle" title="Account Termination">
                <View style={{ gap: getSpacing(4) }}>
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    We reserve the right to suspend or terminate accounts under
                    the following circumstances:
                  </Text>
                  <View
                    className="bg-gray-50 rounded-lg"
                    style={{ padding: scale(8) }}
                  >
                    <Text
                      className="text-gray-700 font-pregular"
                      style={{
                        fontSize: getFontSize(10),
                        lineHeight: getFontSize(14),
                      }}
                    >
                      • Violation of Terms of Service{"\n"}• Evidence of
                      fraudulent activity{"\n"}• Security risks to other users
                      {"\n"}• Non-compliance with regulations{"\n"}• Extended
                      account inactivity
                    </Text>
                  </View>
                </View>
              </PolicySection>

              <PolicySection icon="shield" title="Limitation of Liability">
                <View style={{ gap: getSpacing(4) }}>
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    CheckUpp Health Passport operates as a health information
                    platform. We are not liable for:
                  </Text>
                  <View
                    className="bg-yellow-50 rounded-lg border border-yellow-200"
                    style={{ padding: scale(8) }}
                  >
                    <Text
                      className="text-gray-700 font-pregular"
                      style={{
                        fontSize: getFontSize(10),
                        lineHeight: getFontSize(14),
                      }}
                    >
                      • Clinical decisions made using app data{"\n"}• Technical
                      interruptions beyond our control{"\n"}• Third-party
                      service integrations{"\n"}• Medical outcomes from app
                      usage{"\n"}• Data loss due to user error
                    </Text>
                  </View>
                </View>
              </PolicySection>

              <PolicySection icon="refresh" title="Policy Updates" isLast>
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  We may update these Terms of Service periodically to reflect
                  changes in our services or legal requirements. Continued use
                  after changes constitutes acceptance of updated terms.
                </Text>
              </PolicySection>

              {/* Effective Date Footer */}
              <View
                className="bg-gray-50 rounded-lg border border-gray-200"
                style={{ padding: scale(10) }}
              >
                <Text
                  className="text-center text-gray-500 font-pregular"
                  style={{ fontSize: getFontSize(8) }}
                >
                  These Terms of Service are effective as of September 5, 2025
                </Text>
                <Text
                  className="text-center text-gray-500 font-pregular"
                  style={{
                    fontSize: getFontSize(8),
                    marginTop: verticalScale(2),
                  }}
                >
                  © 2025 CheckUpp Health Passport. All rights reserved.
                </Text>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default TermsOfService;
