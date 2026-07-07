import {
  View,
  Text,
  Alert,
  Switch,
  Linking,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  PixelRatio,
} from "react-native";
import { router } from "expo-router";
import { useToast } from "@/components/ToastProvider";
import { updateUser } from "@/lib/appwrite/appwrite";
import { requestPasswordReset, signOutWithApi } from "@/lib/auth/api";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

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

const SettingSection = ({
  title,
  icon,
  library = "Ionicons",
  children,
}: any) => {
  const Icon =
    library === "MaterialIcons"
      ? MaterialIcons
      : library === "MaterialCommunityIcons"
        ? MaterialCommunityIcons
        : library === "FontAwesome5"
          ? FontAwesome5
          : Ionicons;

  return (
    <View
      className="bg-white rounded-lg border border-gray-100"
      style={{
        padding: scale(10),
        marginBottom: getSpacing(8),
      }}
    >
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(8) }}
      >
        <View
          className="rounded-full bg-orange-50 items-center justify-center"
          style={{
            width: scale(24),
            height: scale(24),
          }}
        >
          {icon && <Icon name={icon} size={scale(12)} color="#FF9C01" />}
        </View>
        <Text
          className="font-pmedium text-gray-900"
          style={{
            fontSize: getFontSize(13),
            marginLeft: scale(8),
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
};

const IconButton = ({
  icon,
  library = "Ionicons",
  color = "#FF9C01",
  size = 20,
}: any) => {
  const Icon =
    library === "MaterialIcons"
      ? MaterialIcons
      : library === "MaterialCommunityIcons"
        ? MaterialCommunityIcons
        : library === "FontAwesome5"
          ? FontAwesome5
          : Ionicons;

  return <Icon name={icon} size={scale(size * 0.7)} color={color} />;
};

const ListItem = ({
  icon,
  iconLibrary,
  title,
  subtitle,
  action,
  toggle,
  value,
}: any) => (
  <View
    className="flex-row items-center justify-between border-b border-gray-100 last:border-b-0"
    style={{ paddingVertical: getSpacing(8) }}
  >
    <View className="flex-row items-center flex-1">
      <View
        className="rounded-full bg-orange-50 items-center justify-center"
        style={{
          width: scale(18),
          height: scale(18),
        }}
      >
        <IconButton icon={icon} library={iconLibrary} size={10} />
      </View>
      <View className="flex-1" style={{ marginLeft: scale(8) }}>
        <Text
          className="font-pmedium text-gray-900"
          style={{ fontSize: getFontSize(11) }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="font-pregular text-gray-500"
            style={{ fontSize: getFontSize(9) }}
          >
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {toggle ? (
      <Switch
        value={value}
        onValueChange={action}
        thumbColor={value ? "#FF9C01" : "#f4f4f5"}
        trackColor={{ true: "#FFEED9", false: "#f4f4f5" }}
        style={{
          transform: [{ scale: isSmallDevice ? 0.8 : 1 }],
        }}
      />
    ) : action ? (
      <TouchableOpacity onPress={action} style={{ padding: scale(2) }}>
        <IconButton icon="chevron-forward" color="#9CA3AF" size={12} />
      </TouchableOpacity>
    ) : null}
  </View>
);

const Settings = () => {
  const { showToast } = useToast();
  const { user, setUser } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.name || "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setUsername(user?.name || "");
  }, [user?.name]);

  const handleUpdateUsername = async () => {
    if (!user) {
      showToast("User session unavailable. Please sign in again.", "error");
      return;
    }

    if (!username.trim()) {
      showToast("Name cannot be empty.", "error");
      return;
    }

    if (username.trim() === user.name) {
      showToast("No changes to save.", "info");
      return;
    }

    const profileId = user.$id || user.id;
    if (!profileId) {
      showToast(
        "User profile is missing an id. Please sign in again.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updatedUser = await updateUser(profileId, {
        id: profileId,
        email: user.email,
        name: username.trim(),
      });

      setUser((prev: any) => ({ ...prev, name: updatedUser.name }));
      showToast("Profile updated successfully.", "success");
    } catch (error: any) {
      showToast(`Failed to update profile: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOutWithApi();
      router.replace("/onboard");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      showToast("User session unavailable. Please sign in again.", "error");
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await requestPasswordReset(user.email);
      showToast(
        "If that account exists, a reset code has been sent.",
        "success",
      );
      router.push({
        pathname: "/verify-reset-code",
        params: {
          email: user.email,
        },
      });
    } catch (error: any) {
      showToast(`Failed to start password reset: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (notificationsEnabled) {
        Alert.alert(
          "Notifications Disabled",
          "Notifications have been disabled. Please also disable notifications for this app in your phone settings if necessary.",
          [
            { text: "Go to Settings", onPress: () => Linking.openSettings() },
            { text: "OK", style: "cancel" },
          ],
        );
      } else {
        showToast("Notifications enabled successfully.", "success");
      }

      setNotificationsEnabled(!notificationsEnabled);
    } catch (error) {
      console.error("Error toggling notifications:", error);
      showToast(
        `Failed to ${
          notificationsEnabled ? "disable" : "enable"
        } notifications.`,
        "error",
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          logout();
        },
      },
    ]);
  };

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
                  Settings
                </Text>
              </View>

              <TouchableOpacity
                className="justify-center items-center rounded-full bg-orange-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons name="settings" size={scale(16)} color="#FF9C01" />
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
                Account Settings
              </Text>
              <TouchableOpacity>
                <View
                  className="bg-orange-50 rounded-full"
                  style={{
                    paddingHorizontal: scale(8),
                    paddingVertical: scale(2),
                  }}
                >
                  <Text
                    className="text-orange-600 font-pmedium"
                    style={{ fontSize: getFontSize(8) }}
                  >
                    v2.3.2
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              className="flex-1"
              style={{ paddingHorizontal: scale(12) }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: getTabBarSafeBottomPadding(),
              }}
            >
              {/* Profile Header */}
              <View
                className="items-center bg-orange-50 rounded-lg"
                style={{
                  marginBottom: getSpacing(16),
                  padding: scale(12),
                }}
              >
                <View
                  className="bg-orange-100 rounded-full items-center justify-center"
                  style={{
                    width: scale(60),
                    height: scale(60),
                    marginBottom: getSpacing(8),
                  }}
                >
                  <Text
                    className="font-psemibold text-orange-700"
                    style={{ fontSize: getFontSize(18) }}
                  >
                    {username ? username.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
                <Text
                  className="font-psemibold text-gray-900"
                  style={{ fontSize: getFontSize(14) }}
                >
                  {username || "User"}
                </Text>
                <Text
                  className="font-pregular text-gray-600"
                  style={{ fontSize: getFontSize(11) }}
                >
                  {user?.email}
                </Text>
              </View>

              <SettingSection title="Profile Information" icon="person">
                <View style={{ gap: getSpacing(8) }}>
                  <View>
                    <Text
                      className="font-pmedium text-gray-700"
                      style={{
                        fontSize: getFontSize(11),
                        marginBottom: getSpacing(4),
                      }}
                    >
                      Display Name
                    </Text>
                    <TextInput
                      value={username}
                      onChangeText={setUsername}
                      placeholder="Enter your display name"
                      className="border border-gray-200 rounded-lg bg-gray-50 font-pregular"
                      style={{
                        paddingHorizontal: scale(8),
                        paddingVertical: getSpacing(6),
                        fontSize: getFontSize(11),
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <TouchableOpacity
                    className="bg-orange-400 rounded-lg"
                    style={{
                      paddingVertical: getSpacing(6),
                      marginTop: getSpacing(4),
                    }}
                    onPress={handleUpdateUsername}
                    activeOpacity={0.8}
                  >
                    <Text
                      className="text-center text-white font-pmedium"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      Update Profile
                    </Text>
                  </TouchableOpacity>

                  <View
                    className="border-t border-gray-100"
                    style={{ paddingTop: getSpacing(8) }}
                  >
                    <TouchableOpacity
                      className="bg-gray-100 rounded-lg"
                      style={{ paddingVertical: getSpacing(6) }}
                      onPress={handlePasswordReset}
                      activeOpacity={0.8}
                    >
                      <Text
                        className="text-center text-gray-900 font-pmedium"
                        style={{ fontSize: getFontSize(11) }}
                      >
                        Reset Password
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </SettingSection>

              <SettingSection title="Notifications" icon="notifications">
                <ListItem
                  icon="notifications"
                  title="Push Notifications"
                  subtitle="Receive health reminders and updates"
                  toggle={true}
                  value={notificationsEnabled}
                  action={toggleNotifications}
                />
              </SettingSection>

              <SettingSection title="Legal & Privacy" icon="shield-checkmark">
                <ListItem
                  icon="shield-lock"
                  iconLibrary="MaterialCommunityIcons"
                  title="Privacy Policy"
                  subtitle="How we protect your data"
                  action={() => router.push("privacy")}
                />
                <ListItem
                  icon="document-text"
                  title="Terms of Service"
                  subtitle="App usage terms and conditions"
                  action={() => router.push("terms-of-service")}
                />
              </SettingSection>

              <SettingSection title="App Information" icon="information-circle">
                <View style={{ gap: getSpacing(6) }}>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="font-pregular text-gray-600"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      App Version
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      2.3.2
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text
                      className="font-pregular text-gray-600"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      Last Updated
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      August 10, 2025
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text
                      className="font-pregular text-gray-600"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      Platform
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      {Platform.OS} {Platform.Version}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text
                      className="font-pregular text-gray-600"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      Build Number
                    </Text>
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(10) }}
                    >
                      14
                    </Text>
                  </View>
                </View>

                <Text
                  className="text-center text-gray-500 font-pregular"
                  style={{
                    fontSize: getFontSize(8),
                    marginTop: getSpacing(8),
                  }}
                >
                  © 2025 CheckUpp. All rights reserved.
                </Text>
              </SettingSection>

              {/* Logout Button */}
              <TouchableOpacity
                className="bg-red-50 border border-red-200 rounded-lg"
                style={{
                  paddingVertical: getSpacing(8),
                  marginBottom: getSpacing(16),
                }}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="log-out" size={scale(12)} color="#DC2626" />
                  <Text
                    className="text-center text-red-600 font-pmedium"
                    style={{
                      fontSize: getFontSize(11),
                      marginLeft: scale(4),
                    }}
                  >
                    Logout
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <LoadingSpinner visible={loading} />
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default Settings;
