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

const FeatureItem = ({ icon, title, description }: any) => (
  <View style={{ marginBottom: getSpacing(8) }}>
    <View className="flex-row items-start">
      <View
        className="rounded-full bg-orange-50 items-center justify-center"
        style={{
          width: scale(18),
          height: scale(18),
          marginTop: verticalScale(1),
        }}
      >
        <Ionicons name={icon} size={scale(10)} color="#FF9C01" />
      </View>
      <View className="flex-1" style={{ marginLeft: scale(8) }}>
        <Text
          className="font-pmedium text-gray-800"
          style={{ fontSize: getFontSize(11) }}
        >
          {title}
        </Text>
        <Text
          className="text-gray-600 font-pregular"
          style={{
            fontSize: getFontSize(10),
            marginTop: verticalScale(2),
            lineHeight: getFontSize(14),
          }}
        >
          {description}
        </Text>
      </View>
    </View>
  </View>
);

const Privacy = () => {
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
                  Privacy Policy
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
                  name="shield-checkmark"
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
                Your Privacy Matters
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
              <PolicySection icon="information-circle" title="Introduction">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  This privacy policy explains how CheckUpp Health Passport
                  collects, uses, and protects your personal information,
                  including your health information.
                </Text>
              </PolicySection>

              <PolicySection icon="checkmark-circle" title="Consent">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  When you register with CheckUpp Health Passport, you provide
                  consent for our staff to access and use your personal
                  information to provide you with the best possible healthcare.
                  Only staff who need to see your personal information will have
                  access to it.
                </Text>
              </PolicySection>

              <PolicySection
                icon="document-text"
                title="Information We Collect"
              >
                <FeatureItem
                  icon="person"
                  title="Personal Information"
                  description="Name, date of birth, addresses, contact details"
                />
                <FeatureItem
                  icon="medical"
                  title="Health Information"
                  description="Medical history, medications, allergies, immunizations"
                />
                <FeatureItem
                  icon="card"
                  title="Healthcare Identifiers"
                  description="Medicare number, healthcare identifiers, health fund details"
                />
              </PolicySection>

              <PolicySection icon="eye-off" title="Anonymous Access">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  You have the right to deal with us anonymously or under a
                  pseudonym unless it is impracticable for us to do so or unless
                  we are required by law to only deal with identified
                  individuals.
                </Text>
              </PolicySection>

              <PolicySection icon="shield-checkmark" title="Data Protection">
                <FeatureItem
                  icon="lock-closed"
                  title="Secure Storage"
                  description="Your information is stored securely using encryption"
                />
                <FeatureItem
                  icon="people"
                  title="Limited Access"
                  description="Only authorized staff can access your information"
                />
                <FeatureItem
                  icon="globe"
                  title="No Overseas Transfer"
                  description="We don't share information outside Australia without consent"
                />
              </PolicySection>

              <PolicySection icon="share" title="Information Sharing">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  We may share your information with other healthcare providers,
                  when required by law, or in emergencies. We will not use your
                  information for marketing without your express consent.
                </Text>
              </PolicySection>

              <PolicySection icon="document" title="Access and Corrections">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  You can request access to your personal information or ask for
                  corrections. Please submit requests in writing, and we will
                  respond within 30 days.
                </Text>
              </PolicySection>

              <PolicySection icon="warning" title="Complaints">
                <Text
                  className="text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(16),
                  }}
                >
                  If you have concerns about your privacy, please contact us in
                  writing. You can also contact the Office of the Australian
                  Information Commissioner (OAIC) at 1300 363 992 or visit
                  www.oaic.gov.au
                </Text>
              </PolicySection>

              <PolicySection icon="call" title="Contact Us" isLast>
                <View
                  className="bg-orange-50 rounded-lg border border-orange-200"
                  style={{ padding: scale(10) }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(4) }}
                  >
                    <Ionicons
                      name="help-circle"
                      size={scale(14)}
                      color="#FF9C01"
                    />
                    <Text
                      className="text-gray-900 font-pmedium"
                      style={{
                        fontSize: getFontSize(11),
                        marginLeft: scale(6),
                      }}
                    >
                      Need assistance?
                    </Text>
                  </View>
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(10),
                      lineHeight: getFontSize(14),
                    }}
                  >
                    For privacy-related questions or concerns, contact us at
                    support@checkupp.com or through the app&apos;s support
                    section.
                  </Text>
                </View>
              </PolicySection>
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default Privacy;
