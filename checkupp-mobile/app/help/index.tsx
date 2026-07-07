import React, { useState } from "react";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  PixelRatio,
} from "react-native";
import LoadingSpinner from "@/components/LoadingSpinner";
import FeedbackSection from "@/components/FeedbackSection";
import { useGlobalContext } from "@/context/useAuthBootstrap";

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

const SupportSection = ({ icon, title, children, isLast = false }: any) => {
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
            {icon.type === "Ionicons" ? (
              <Ionicons name={icon.name} size={scale(14)} color="#FF9C01" />
            ) : (
              <MaterialIcons
                name={icon.name}
                size={scale(14)}
                color="#FF9C01"
              />
            )}
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

const HelpSection = ({ icon, title, description }: any) => (
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

const HelpScreen = () => {
  const { loading } = useGlobalContext();

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
                  Help & Support
                </Text>
              </View>

              <TouchableOpacity
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons name="help-circle" size={scale(16)} color="#FF9C01" />
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
                We&apos;re Here to Help
              </Text>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1"
            >
              <ScrollView
                className="flex-1"
                style={{ paddingHorizontal: scale(12) }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingBottom: getTabBarSafeBottomPadding(),
                }}
              >
                <SupportSection
                  icon={{ type: "Ionicons", name: "rocket" }}
                  title="Getting Started"
                >
                  <Text
                    className="text-gray-600 font-pregular"
                    style={{
                      fontSize: getFontSize(11),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    Welcome to CheckUpp Health Passport&apos;s Help Center. Find
                    answers to common questions and learn how to make the most
                    of your digital health journey.
                  </Text>
                </SupportSection>

                <SupportSection
                  icon={{ type: "Ionicons", name: "person-circle" }}
                  title="Account Management"
                >
                  <HelpSection
                    icon="person"
                    title="Profile Setup"
                    description="Create and update your personal profile information"
                  />
                  <HelpSection
                    icon="shield-checkmark"
                    title="Privacy Settings"
                    description="Manage your privacy and data sharing preferences"
                  />
                  <HelpSection
                    icon="key"
                    title="Password & Security"
                    description="Reset your password and manage security settings"
                  />
                  <HelpSection
                    icon="trash"
                    title="Account Deletion"
                    description="Learn how to permanently delete your account"
                  />
                </SupportSection>

                <SupportSection
                  icon={{ type: "MaterialIcons", name: "settings" }}
                  title="App Settings"
                >
                  <HelpSection
                    icon="notifications"
                    title="Notifications"
                    description="Customize notification preferences and reminders"
                  />
                  <HelpSection
                    icon="eye"
                    title="Privacy Controls"
                    description="Adjust who can see your health information"
                  />
                  <HelpSection
                    icon="share"
                    title="Data Sharing"
                    description="Configure how data is shared with providers"
                  />
                  <HelpSection
                    icon="cloud"
                    title="Backup Options"
                    description="Set up automatic backups for your health data"
                  />
                </SupportSection>

                <SupportSection
                  icon={{ type: "Ionicons", name: "build" }}
                  title="Troubleshooting"
                >
                  <HelpSection
                    icon="speedometer"
                    title="App Performance"
                    description="Tips to optimize app speed and responsiveness"
                  />
                  <HelpSection
                    icon="sync"
                    title="Data Sync Issues"
                    description="Resolve problems with data synchronization"
                  />
                  <HelpSection
                    icon="log-in"
                    title="Login Problems"
                    description="Solutions for authentication and access issues"
                  />
                  <HelpSection
                    icon="document"
                    title="Upload Issues"
                    description="Fix problems with uploading documents and photos"
                  />
                </SupportSection>

                <SupportSection
                  icon={{ type: "MaterialIcons", name: "support-agent" }}
                  title="Contact Support"
                  isLast
                >
                  <View
                    className="bg-orange-50 rounded-lg border border-orange-200"
                    style={{ padding: scale(10) }}
                  >
                    <View
                      className="flex-row items-center"
                      style={{ marginBottom: getSpacing(4) }}
                    >
                      <Ionicons
                        name="chatbubbles"
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
                        Need additional help?
                      </Text>
                    </View>
                    <Text
                      className="text-gray-600 font-pregular"
                      style={{
                        fontSize: getFontSize(10),
                        lineHeight: getFontSize(14),
                        marginBottom: getSpacing(12),
                      }}
                    >
                      Our support team is available 24/7 to assist you with any
                      questions or concerns about your health passport.
                    </Text>
                    <TouchableOpacity
                      onPress={() => console.log("Contact Support pressed")}
                      className="bg-orange-400 rounded-lg"
                      style={{
                        paddingVertical: getSpacing(8),
                        paddingHorizontal: scale(12),
                      }}
                    >
                      <Text
                        className="text-center text-white font-pmedium"
                        style={{ fontSize: getFontSize(11) }}
                      >
                        Contact Support Team
                      </Text>
                    </TouchableOpacity>
                  </View>
                </SupportSection>

                <FeedbackSection />
              </ScrollView>
            </KeyboardAvoidingView>
          </View>

          <LoadingSpinner visible={loading} />
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default HelpScreen;
