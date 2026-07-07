import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Platform,
  Dimensions,
  PixelRatio,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import {
  ScrollView,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Yup from "yup";
import { Formik } from "formik";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import FormField from "@/components/FormField";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import { resetPasswordWithCode } from "@/lib/auth/api";
import { useAuthScreenKeyboard } from "@/components/auth/useAuthScreenKeyboard";

const { width, height } = Dimensions.get("window");

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.6);
  if (isSmallDevice) return verticalScale(size * 0.7);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.8);
};

const validationSchema = Yup.object({
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your new password"),
});

const ResetPassword = () => {
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { keyboardVisible } = useAuthScreenKeyboard();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email],
  );

  const resetCode = useMemo(
    () => (typeof params.code === "string" ? params.code : ""),
    [params.code],
  );

  useEffect(() => {
    if (!initialEmail || !resetCode) {
      showToast(
        "Verify your reset code before choosing a new password.",
        "info",
      );
      router.replace({
        pathname: "/verify-reset-code",
        params: initialEmail
          ? {
              email: initialEmail,
            }
          : undefined,
      });
    }
  }, [initialEmail, resetCode, showToast]);

  const handleSubmit = async (values: {
    password: string;
    confirmPassword: string;
  }) => {
    if (!initialEmail || !resetCode) {
      showToast("Verify your reset code before continuing.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPasswordWithCode(initialEmail, resetCode, values.password);
      showToast("Password reset successfully. Please sign in.", "success");
      router.replace({
        pathname: "/sign-in",
        params: {
          email: initialEmail,
        },
      });
    } catch (error: any) {
      showToast(error.message || "Failed to reset password.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!initialEmail || !resetCode) {
    return <LoadingSpinner visible />;
  }

  return (
    <GestureHandlerRootView>
      <SafeAreaView className="bg-white h-full">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                padding: scale(10),
                marginLeft: scale(4),
                marginTop: scale(8),
                marginBottom: scale(4),
                alignSelf: "flex-start",
              }}
              onPress={() =>
                router.replace({
                  pathname: "/verify-reset-code",
                  params: {
                    email: initialEmail,
                  },
                })
              }
            >
              <Ionicons name="arrow-back" size={scale(24)} color="#222" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            alwaysBounceVertical={false}
            overScrollMode="never"
          >
            <View
              className="w-full flex-1 justify-center"
              style={{
                paddingHorizontal: scale(16),
                paddingVertical: getSpacing(
                  keyboardVisible
                    ? isVerySmallDevice
                      ? 10
                      : 14
                    : isVerySmallDevice
                      ? 16
                      : 24,
                ),
              }}
            >
              <View
                style={{ marginBottom: getSpacing(keyboardVisible ? 10 : 16) }}
              >
                <Text
                  className="text-center text-secondary-200 font-psemibold"
                  style={{ fontSize: getFontSize(isTablet ? 28 : 24) }}
                >
                  Reset Password
                </Text>
                <Text
                  className="text-center text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(15),
                    marginTop: getSpacing(6),
                    lineHeight: getFontSize(22),
                  }}
                >
                  Choose a new password for your account after verifying your
                  reset code.
                </Text>
              </View>

              <View style={{ marginBottom: getSpacing(8) }}>
                <FormField
                  title="Email"
                  value={initialEmail}
                  handleChangeText={() => {}}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  disabled
                  compact
                />
              </View>

              <Formik
                initialValues={{
                  password: "",
                  confirmPassword: "",
                }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
              >
                {({ handleChange, handleSubmit, values, errors, touched }) => (
                  <View style={{ gap: getSpacing(8) }}>
                    <View>
                      <FormField
                        title="New Password"
                        value={values.password}
                        handleChangeText={handleChange("password")}
                        placeholder="Enter your new password"
                        secureTextEntry
                        compact
                      />
                      {touched.password && errors.password ? (
                        <Text
                          className="text-red-500 font-pregular"
                          style={{
                            fontSize: getFontSize(12),
                            marginTop: verticalScale(2),
                            marginLeft: scale(4),
                          }}
                        >
                          {errors.password}
                        </Text>
                      ) : null}
                    </View>

                    <View>
                      <FormField
                        title="Confirm Password"
                        value={values.confirmPassword}
                        handleChangeText={handleChange("confirmPassword")}
                        placeholder="Confirm your new password"
                        secureTextEntry
                        compact
                      />
                      {touched.confirmPassword && errors.confirmPassword ? (
                        <Text
                          className="text-red-500 font-pregular"
                          style={{
                            fontSize: getFontSize(12),
                            marginTop: verticalScale(2),
                            marginLeft: scale(4),
                          }}
                        >
                          {errors.confirmPassword}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ marginTop: getSpacing(12) }}>
                      <CustomButton
                        title={isSubmitting ? "Resetting..." : "Reset Password"}
                        handlePress={handleSubmit}
                        containerStyles="bg-secondary rounded-full"
                        textStyles="text-black font-psemibold"
                        isLoading={isSubmitting}
                      />
                    </View>
                  </View>
                )}
              </Formik>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ResetPassword;
