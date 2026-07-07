import {
  View,
  Text,
  Image,
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
import { images } from "@/constants";
import FormField from "@/components/FormField";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { requestPasswordReset } from "@/lib/auth/api";
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

const getImageSize = () => {
  if (isTablet) return { width: scale(252), height: scale(288) };
  if (isVerySmallDevice) return { width: scale(164), height: scale(182) };
  if (isSmallDevice) return { width: scale(182), height: scale(200) };
  return { width: scale(202), height: scale(220) };
};

const ForgotPassword = () => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { keyboardVisible } = useAuthScreenKeyboard();

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
  });

  const handleResetPassword = async (email: string) => {
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      showToast(
        "If that account exists, we sent a reset code to the email address.",
        "success",
      );
      router.push({
        pathname: "/verify-reset-code",
        params: {
          email,
        },
      });
    } catch (error: any) {
      showToast(error.message || "Failed to send reset code.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="bg-white flex-1">
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
              onPress={() => router.back()}
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
              className="flex-1 w-full justify-center"
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
                className="items-center"
                style={{ marginBottom: getSpacing(keyboardVisible ? 12 : 20) }}
              >
                <Image
                  source={images.forgotPassword}
                  resizeMode="contain"
                  style={{
                    width: keyboardVisible
                      ? getImageSize().width * 0.72
                      : getImageSize().width,
                    height: keyboardVisible
                      ? getImageSize().height * 0.72
                      : getImageSize().height,
                    marginBottom: getSpacing(keyboardVisible ? 10 : 16),
                  }}
                />

                <Text
                  className="text-center text-secondary-200 font-psemibold"
                  style={{
                    fontSize: getFontSize(isTablet ? 28 : 24),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Forgot Password
                </Text>

                <Text
                  className="text-center text-gray-600 font-pregular"
                  style={{
                    fontSize: getFontSize(16),
                    lineHeight: getFontSize(22),
                    paddingHorizontal: scale(8),
                    maxWidth: scale(isTablet ? 400 : 320),
                  }}
                >
                  Enter your email address, and we&apos;ll send you a six-digit
                  code to reset your password.
                </Text>
              </View>

              <Formik
                initialValues={{ email: "" }}
                validationSchema={validationSchema}
                onSubmit={(values) => handleResetPassword(values.email)}
              >
                {({ handleChange, handleSubmit, values, errors, touched }) => (
                  <View style={{ gap: getSpacing(12) }}>
                    <View>
                      <FormField
                        title="Email"
                        value={values.email}
                        handleChangeText={handleChange("email")}
                        placeholder="Enter your email"
                        keyboardType="email-address"
                        compact
                      />
                      {touched.email && errors.email ? (
                        <Text
                          className="text-red-500 font-pregular"
                          style={{
                            fontSize: getFontSize(12),
                            marginTop: verticalScale(2),
                            marginLeft: scale(4),
                          }}
                        >
                          {errors.email}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ marginTop: getSpacing(16) }}>
                      <CustomButton
                        title={
                          isSubmitting ? "Sending Code..." : "Send Reset Code"
                        }
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

export default ForgotPassword;
