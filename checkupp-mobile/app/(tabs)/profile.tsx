import { router } from "expo-router";
import UserAvatar from "@/components/UserAvatar";
import { useToast } from "@/components/ToastProvider";
import { signOutWithApi } from "@/lib/auth/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  Modal,
  Alert,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  PixelRatio,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";

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
  const extraPadding = getSpacing(16);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

const Profile = () => {
  const { user } = useGlobalContext();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { showToast } = useToast();
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogout = () => {
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to logout? You'll need to sign in again to access your health passport.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: logout,
        },
      ],
    );
  };

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      await signOutWithApi();
      setMenuVisible(false);
      showToast("Successfully logged out", "success");
    } catch (error: any) {
      setIsLoggingOut(false);
      console.error("Logout error:", error);
      showToast(error.message, "error");
    }
  };

  const profileOptions = [
    {
      icon: "account-outline",
      title: "Personal Details",
      subtitle: "Manage your profile",
      route: "/personal-details",
      iconColor: "#FF9C01",
      bgGradient: ["#FF9C0115", "#FF9C0108"],
    },
    {
      icon: "heart-pulse",
      title: "Health Data",
      subtitle: "Track health metrics",
      route: "/health-screening",
      iconColor: "#00CED1",
      bgGradient: ["#00CED115", "#00CED108"],
    },
    {
      icon: "bell-ring",
      title: "Reminders",
      subtitle: "Health objectives",
      route: "/reminders",
      iconColor: "#4ECDC4",
      bgGradient: ["#4ECDC415", "#4ECDC408"],
    },
    {
      icon: "shield-account",
      title: "Consent Requests",
      subtitle: "Approve clinician access",
      route: "/consent-requests",
      iconColor: "#2563EB",
      bgGradient: ["#2563EB15", "#2563EB08"],
    },
  ];

  const menuOptions = [
    {
      icon: "shield-check-outline",
      title: "Privacy Policy",
      subtitle: "Data protection",
      route: "/privacy",
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      subtitle: "Get assistance",
      route: "/help",
    },
    {
      icon: "cog-outline",
      title: "Settings",
      subtitle: "Customize app",
      route: "/settings",
    },
  ];

  const avatarFrameSize = scale(100);
  const avatarInnerSize = Math.max(1, avatarFrameSize - 8);

  if (isLoggingOut) {
    return <LoadingSpinner visible text="Signing you out..." />;
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="relative">
          <LinearGradient
            colors={["#00CED1", "#20B2AA", "#008B8B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingBottom: getSpacing(24) }}
          >
            {/* Background Pattern */}
            <View className="absolute inset-0 opacity-10">
              <View
                className="absolute rounded-full bg-white/20"
                style={{
                  top: scale(20),
                  right: scale(20),
                  width: scale(80),
                  height: scale(80),
                }}
              />
              <View
                className="absolute rounded-full bg-white/15"
                style={{
                  top: scale(60),
                  left: scale(12),
                  width: scale(50),
                  height: scale(50),
                }}
              />
              <View
                className="absolute rounded-full bg-white/10"
                style={{
                  top: scale(30),
                  right: scale(70),
                  width: scale(35),
                  height: scale(35),
                }}
              />
            </View>

            <View
              style={{
                paddingHorizontal: scale(12),
                paddingTop: getSpacing(12),
              }}
            >
              <View
                className="flex-row justify-end items-center"
                style={{ marginBottom: getSpacing(24) }}
              >
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  className="bg-white/20 backdrop-blur-sm rounded-full shadow-lg"
                  style={{
                    padding: scale(8),
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  }}
                >
                  <MaterialCommunityIcons
                    name="menu"
                    size={scale(18)}
                    color="white"
                  />
                </TouchableOpacity>
              </View>

              <Animated.View
                style={{ opacity: fadeAnim }}
                className="items-center"
              >
                <View
                  className="relative"
                  style={{ marginBottom: getSpacing(16) }}
                >
                  <View
                    className="rounded-full border-4 border-white/90 overflow-hidden shadow-xl bg-white items-center justify-center"
                    style={{
                      width: avatarFrameSize,
                      height: avatarFrameSize,
                    }}
                  >
                    <UserAvatar
                      seed={user?.$id ?? user?.id ?? user?.email ?? user?.name}
                      imageUrl={user?.avatarUrl ?? user?.avatar}
                      name={user?.name}
                      gender={user?.gender}
                      size={avatarInnerSize}
                    />
                  </View>
                </View>

                <Text
                  className="font-pbold text-white text-center"
                  style={{
                    fontSize: getFontSize(18),
                    marginBottom: verticalScale(2),
                  }}
                >
                  {user?.name || ""}
                </Text>
                <Text
                  className="font-pregular text-white/90 text-center"
                  style={{ fontSize: getFontSize(13) }}
                >
                  {user?.email || ""}
                </Text>
              </Animated.View>
            </View>
          </LinearGradient>

          {/* Curved Bottom */}
          <View
            className="absolute bottom-0 left-0 right-0 bg-gray-50"
            style={{
              height: scale(16),
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          />
        </View>

        {/* Profile Options */}
        <View
          className="flex-1"
          style={{
            paddingHorizontal: scale(12),
            paddingTop: getSpacing(12),
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
        >
          <Text
            className="font-psemibold text-black"
            style={{
              fontSize: getFontSize(16),
              marginBottom: getSpacing(12),
            }}
          >
            Quick Actions
          </Text>

          <View style={{ gap: getSpacing(10) }}>
            {profileOptions.map((option, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => router.push(option.route)}
                  className="rounded-lg bg-white border border-gray-100"
                  activeOpacity={0.7}
                  style={{
                    padding: scale(14),
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(10),
                        marginRight: scale(12),
                        backgroundColor: option.iconColor + "15",
                      }}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={scale(20)}
                        color={option.iconColor}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="font-pmedium text-black"
                        style={{
                          fontSize: getFontSize(14),
                          marginBottom: verticalScale(2),
                        }}
                      >
                        {option.title}
                      </Text>
                      <Text
                        className="font-pregular text-gray-500"
                        style={{ fontSize: getFontSize(11) }}
                      >
                        {option.subtitle}
                      </Text>
                    </View>
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(6),
                        backgroundColor: option.iconColor + "10",
                      }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={scale(16)}
                        color={option.iconColor}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Compact Modal */}
        <Modal
          transparent
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
          statusBarTranslucent
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
            <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
              <View className="flex-1 justify-end">
                <TouchableWithoutFeedback>
                  <View className="bg-white rounded-t-3xl overflow-hidden shadow-2xl">
                    {/* Modal Header */}
                    <View className="bg-white border-b border-gray-100">
                      <View
                        className="bg-gray-300 rounded-full mx-auto"
                        style={{
                          width: scale(32),
                          height: scale(3),
                          marginTop: getSpacing(8),
                          marginBottom: getSpacing(12),
                        }}
                      />

                      <View
                        style={{
                          paddingHorizontal: scale(16),
                          paddingBottom: getSpacing(16),
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text
                              className="font-psemibold text-black"
                              style={{ fontSize: getFontSize(16) }}
                            >
                              More Options
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => setMenuVisible(false)}
                            className="bg-gray-100 rounded-full items-center justify-center"
                            style={{
                              width: scale(32),
                              height: scale(32),
                            }}
                          >
                            <Ionicons
                              name="close"
                              size={scale(16)}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Menu Content */}
                    <View
                      style={{
                        paddingHorizontal: scale(16),
                        paddingBottom: getSpacing(24),
                      }}
                    >
                      {menuOptions.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => {
                            setMenuVisible(false);
                            router.push(item.route);
                          }}
                          className="flex-row items-center rounded-lg bg-white border border-gray-100 active:bg-gray-50"
                          style={{
                            padding: scale(14),
                            marginBottom: getSpacing(8),
                          }}
                        >
                          <View
                            className="rounded-lg bg-teal-50 items-center justify-center"
                            style={{
                              width: scale(36),
                              height: scale(36),
                              marginRight: scale(12),
                            }}
                          >
                            <MaterialCommunityIcons
                              name={item.icon as any}
                              size={scale(18)}
                              color="#00CED1"
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-pmedium text-black"
                              style={{ fontSize: getFontSize(14) }}
                            >
                              {item.title}
                            </Text>
                            <Text
                              className="font-pregular text-gray-500"
                              style={{
                                fontSize: getFontSize(11),
                                marginTop: verticalScale(2),
                              }}
                            >
                              {item.subtitle}
                            </Text>
                          </View>
                          <View
                            className="rounded-lg bg-teal-50"
                            style={{ padding: scale(6) }}
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={scale(16)}
                              color="#00CED1"
                            />
                          </View>
                        </TouchableOpacity>
                      ))}

                      {/* Logout Section */}
                      <View
                        className="border-t border-gray-100"
                        style={{
                          marginTop: getSpacing(12),
                          paddingTop: getSpacing(16),
                        }}
                      >
                        <TouchableOpacity
                          onPress={handleLogout}
                          className="flex-row items-center justify-center rounded-lg bg-red-50 border border-red-100 active:bg-red-100"
                          style={{ padding: scale(14) }}
                        >
                          <View
                            className="bg-white rounded-lg items-center justify-center"
                            style={{
                              width: scale(28),
                              height: scale(28),
                              marginRight: scale(10),
                            }}
                          >
                            <MaterialCommunityIcons
                              name="logout"
                              size={scale(16)}
                              color="#EF4444"
                            />
                          </View>
                          <Text
                            className="font-pmedium text-red-600"
                            style={{ fontSize: getFontSize(14) }}
                          >
                            Logout Account
                          </Text>
                        </TouchableOpacity>

                        <Text
                          className="font-pregular text-gray-500 text-center"
                          style={{
                            fontSize: getFontSize(10),
                            marginTop: getSpacing(10),
                          }}
                        >
                          You&apos;ll need to sign in again to access your
                          health passport
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Profile;
