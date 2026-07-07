import {
  Text,
  View,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Gender } from "@/app/(tabs)/health-screening";
import { useToast } from "@/components/ToastProvider";
import LoadingSpinner from "@/components/LoadingSpinner";
import RadioComponent from "@/components/RadioComponent";
import { updateUser } from "@/lib/appwrite/appwrite";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import PhoneInput from "@/components/PhonenumberInput";
import { DatePicker } from "@/components/common/DatePicker";
import * as Location from "expo-location";
import countryCodes from "@/constants/countryCodes";
import {
  DEFAULT_POST_PROFILE_ROUTE,
  PROFILE_COMPLETION_CONTEXT,
} from "@/lib/auth/profileCompletion";

const { width, height } = Dimensions.get("window");
const constrainedWidth = Math.min(width, 430);
const constrainedHeight = Math.min(height, 900);

// Responsive scaling
const scale = (size: number) => (constrainedWidth / 350) * size;
const verticalScale = (size: number) => (constrainedHeight / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (constrainedWidth < 320) return moderateScale(size, 0.15);
  if (constrainedWidth < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = constrainedWidth < 350 || constrainedHeight < 600;
const isVerySmallDevice = constrainedWidth < 320;
const contentMaxWidth = isTablet ? Math.min(width * 0.72, 760) : undefined;

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

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  required = false,
  icon = "pencil-outline",
  maxLength,
  onPress,
}: any) => (
  <View
    className="bg-white rounded-lg border border-gray-100"
    style={{
      padding: scale(10),
      marginBottom: getSpacing(8),
    }}
  >
    <View className="flex-row justify-between items-center">
      <Text
        className="font-pmedium text-gray-900"
        style={{ fontSize: getFontSize(13) }}
      >
        {label} {required && <Text className="text-orange-500">*</Text>}
      </Text>
      {!editable && (
        <View
          className="bg-orange-50 rounded-full"
          style={{
            paddingHorizontal: scale(6),
            paddingVertical: scale(2),
          }}
        >
          <Text
            className="text-orange-600 font-pmedium"
            style={{ fontSize: getFontSize(9) }}
          >
            Read Only
          </Text>
        </View>
      )}
    </View>

    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center ${
        editable && !onPress ? "border-b border-gray-200" : ""
      }`}
      style={{ marginTop: getSpacing(6) }}
    >
      {editable && !onPress ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          maxLength={maxLength}
          className="flex-1 font-pregular text-gray-900"
          placeholderTextColor="#9CA3AF"
          style={{
            fontSize: getFontSize(12),
            paddingVertical: getSpacing(4),
          }}
        />
      ) : (
        <Text
          className={`flex-1 font-pregular ${
            editable ? "text-gray-900" : "text-gray-600 bg-gray-50"
          }`}
          style={{
            fontSize: getFontSize(12),
            paddingVertical: getSpacing(4),
          }}
        >
          {value || placeholder}
        </Text>
      )}
      <Ionicons
        name={editable ? icon : "lock-closed"}
        size={scale(16)}
        color={editable ? "#FF9C01" : "#9CA3AF"}
      />
    </TouchableOpacity>
  </View>
);

const DEFAULT_COUNTRY_CODE = "+61"; // Australia

const computeAgeFromDate = (date?: Date) => {
  if (!date) return undefined;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDifference = today.getMonth() - date.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < date.getDate())
  ) {
    age--;
  }
  return age > 0 ? age : undefined;
};

const findCountryCodeByIso = (iso?: string | null) => {
  if (!iso) return null;
  const match = countryCodes.find(
    (country) => country.short.toLowerCase() === iso.toLowerCase(),
  );
  return match?.code ?? null;
};

const isValidPhoneNumber = (value: string) => {
  const sanitized = value.replace(/\s+/g, "");
  if (!sanitized.startsWith("+")) return false;

  const country = countryCodes.find((c) => sanitized.startsWith(c.code));
  if (!country) return false;

  const localNumber = sanitized.slice(country.code.length);
  return (
    localNumber.length >= country.minLength &&
    localNumber.length <= country.maxLength
  );
};

const PersonalDetails = () => {
  const { showToast } = useToast();
  const { user, setUser } = useGlobalContext();
  const [loading, setLoading] = useState(false);
  const [defaultCountryCode, setDefaultCountryCode] =
    useState<string>(DEFAULT_COUNTRY_CODE);
  const params = useLocalSearchParams<{
    context?: string;
    next?: string;
  }>();

  const isCompletionFlow = params.context === PROFILE_COMPLETION_CONTEXT;
  const nextRoute = useMemo(() => {
    if (typeof params.next !== "string") return DEFAULT_POST_PROFILE_ROUTE;

    try {
      const decoded = decodeURIComponent(params.next);
      return decoded.startsWith("/") ? decoded : DEFAULT_POST_PROFILE_ROUTE;
    } catch {
      return DEFAULT_POST_PROFILE_ROUTE;
    }
  }, [params.next]);

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    gender: user?.gender || "",
    phoneNumber: user?.phoneNumber || "",
    dateOfBirth: user?.dob ? new Date(user.dob) : new Date(2000, 0, 1),
  });

  const age = useMemo(
    () => computeAgeFromDate(formData.dateOfBirth),
    [formData.dateOfBirth],
  );

  useEffect(() => {
    let isMounted = true;

    const deriveCountryCode = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) setDefaultCountryCode(DEFAULT_COUNTRY_CODE);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const [place] = await Location.reverseGeocodeAsync(position.coords);
        const derivedCode = findCountryCodeByIso(place?.isoCountryCode);

        if (isMounted) {
          setDefaultCountryCode(derivedCode || DEFAULT_COUNTRY_CODE);
        }
      } catch {
        if (isMounted) {
          setDefaultCountryCode(DEFAULT_COUNTRY_CODE);
        }
      }
    };

    deriveCountryCode();

    return () => {
      isMounted = false;
    };
  }, []);

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      showToast("Please enter your full name", "error");
      return false;
    }

    if (!formData.phoneNumber.trim()) {
      showToast("Please enter your phone number", "error");
      return false;
    }

    if (!isValidPhoneNumber(formData.phoneNumber.trim())) {
      showToast("Please enter a valid phone number", "error");
      return false;
    }

    const today = new Date();
    if (formData.dateOfBirth > today) {
      showToast("Please enter a valid date of birth", "error");
      return false;
    }

    if (!age) {
      showToast("Please select a valid date of birth", "error");
      return false;
    }

    if (!formData.gender) {
      showToast("Please select your gender", "error");
      return false;
    }

    return true;
  };

  const handleUpdateDetails = async () => {
    if (!validateForm()) return;
    if (!user) {
      showToast("User session unavailable. Please sign in again.", "error");
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
      const updatedUser = await updateUser(profileId, {
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        dob: formData.dateOfBirth.toISOString(),
        gender: formData.gender,
      });

      setUser({ ...user, ...updatedUser });
      showToast("Personal details updated successfully!", "success");

      if (isCompletionFlow) {
        router.replace(nextRoute);
      }
    } catch (error: any) {
      showToast(`Update failed: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (isCompletionFlow) {
      showToast(
        "Please complete your profile before continuing to the dashboard.",
        "info",
      );
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(isCompletionFlow ? nextRoute : DEFAULT_POST_PROFILE_ROUTE);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={["#ffffff", "#f8f8f8"]} style={{ flex: 1 }}>
        <SafeAreaView className="flex-1">
          <View
            style={{
              flex: 1,
              width: "100%",
              maxWidth: contentMaxWidth,
              alignSelf: "center",
            }}
          >
            {/* <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            style={{ flex: 1 }}
          > */}
            {/* Compact Header */}
            <View
              style={{
                paddingHorizontal: scale(12),
                paddingVertical: getSpacing(8),
              }}
            >
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={handleBackPress}
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
                    Personal Details
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
                    name="person-outline"
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
                  Your Information
                </Text>
                <TouchableOpacity>
                  <Ionicons
                    name="create-outline"
                    size={scale(18)}
                    color="#FF9C01"
                  />
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
                <InputField
                  label="Full Name"
                  value={formData.fullName}
                  onChangeText={(text: string) =>
                    setFormData((prev) => ({ ...prev, fullName: text }))
                  }
                  placeholder="Enter your full name"
                  required
                />

                <InputField
                  label="Email"
                  value={formData.email}
                  placeholder="Your email address"
                  keyboardType="email-address"
                  editable={false}
                />

                <View
                  className="bg-white rounded-lg border border-gray-100"
                  style={{
                    padding: scale(10),
                    marginBottom: getSpacing(8),
                  }}
                >
                  <Text
                    className="font-pmedium text-gray-900"
                    style={{
                      fontSize: getFontSize(13),
                      marginBottom: getSpacing(6),
                    }}
                  >
                    Gender
                  </Text>
                  <View className="flex-row flex-wrap">
                    {[
                      { type: "male", icon: "male-outline" },
                      { type: "female", icon: "female-outline" },
                      { type: "prefer not to say", icon: "person-outline" },
                    ].map(({ type, icon }) => (
                      <RadioComponent
                        key={type}
                        type={type as Gender}
                        icon={icon as any}
                        selected={formData.gender === type}
                        onSelect={(value: any) =>
                          setFormData((prev) => ({ ...prev, gender: value }))
                        }
                      />
                    ))}
                  </View>
                </View>

                <PhoneInput
                  label="Phone Number"
                  value={formData.phoneNumber}
                  onChangeText={(text: string) =>
                    setFormData((prev) => ({ ...prev, phoneNumber: text }))
                  }
                  placeholder="Enter your phone number"
                  required
                  defaultCountryCode={defaultCountryCode}
                />

                {/* Updated to use the reusable DatePicker component */}
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onDateChange={(date) =>
                    setFormData((prev) => ({ ...prev, dateOfBirth: date }))
                  }
                  placeholder="Select your date of birth"
                  required
                  title="Date of Birth"
                  subtitle="Select Your"
                  maxDate={new Date()}
                  minDate={new Date(1900, 0, 1)}
                  dateFormat={(date) =>
                    date.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  }
                />

                <InputField
                  label="Age"
                  value={age ? `${age} years old` : ""}
                  placeholder="Select your date of birth"
                  editable={false}
                  required
                />

                <TouchableOpacity
                  onPress={handleUpdateDetails}
                  className="bg-orange-400 rounded-lg active:bg-orange-500"
                  style={{
                    paddingVertical: getSpacing(10),
                    marginTop: getSpacing(4),
                    marginBottom: getSpacing(16),
                  }}
                >
                  <Text
                    className="text-center text-black font-psemibold"
                    style={{ fontSize: getFontSize(14) }}
                  >
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            <LoadingSpinner visible={loading} />
            {/* </KeyboardAvoidingView> */}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </GestureHandlerRootView>
  );
};

export default PersonalDetails;
