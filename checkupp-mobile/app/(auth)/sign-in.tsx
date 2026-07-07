import {
  ScrollView,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import {
  View,
  Text,
  Image,
  Animated,
  Platform,
  Dimensions,
  PixelRatio,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import * as Yup from "yup";
import { Formik } from "formik";
import { useQueryClient } from "@tanstack/react-query";
import FormField from "@/components/FormField";
import { images } from "@/constants";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import { Link, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import ButtonLoadAnimation from "@/components/LoadButtonAnimation";
import React, { useMemo, useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import {
  getCurrentUserProfile,
  primeAuthenticatedUserData,
  signInWithApi,
} from "@/lib/auth/api";
import { getReadableSignInErrorMessage } from "../../lib/auth/errorMessages";
import { getPostAuthRoute } from "@/lib/auth/profileCompletion";
import { Ionicons } from "@expo/vector-icons";
import { useAuthScreenKeyboard } from "@/components/auth/useAuthScreenKeyboard";
import useScreenEntrance from "@/lib/animation/useScreenEntrance";

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

const SignIn = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const { keyboardVisible } = useAuthScreenKeyboard();
  const queryClient = useQueryClient();
  const entranceAnim = useScreenEntrance();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email],
  );

  const validationSchema = Yup.object().shape({
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .min(8, "Password must be at least 8 characters")
      .required("Password is required"),
  });

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsSubmitting(true);

    try {
      await signInWithApi(values);
      const userProfile = await getCurrentUserProfile();

      if (!userProfile) {
        showToast("User profile was not found after sign-in.", "error");
        return;
      }

      void primeAuthenticatedUserData(userProfile);
      await queryClient.invalidateQueries({ queryKey: ["auth"], exact: false });
      router.replace(getPostAuthRoute(userProfile));
    } catch (error: any) {
      if (error instanceof ApiClientError) {
        const details = error.details as
          | { code?: string; email?: string }
          | undefined;

        if (error.code === "AUTH_EMAIL_NOT_VERIFIED") {
          const pendingEmail = details?.email || values.email;
          showToast("Please verify your email before signing in.", "info");

          router.push({
            pathname: "/verify-email",
            params: {
              email: pendingEmail,
              source: "signin",
            },
          });
          return;
        }

        if (error.code === "AUTH_NETWORK_ERROR") {
          showToast(getReadableSignInErrorMessage(error), "error");
          return;
        }

        showToast(getReadableSignInErrorMessage(error), "error");
        return;
      }

      showToast(
        "We couldn't sign you in right now. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
              className="w-full flex-1 justify-center"
              style={{
                paddingHorizontal: scale(16),
                paddingVertical: getSpacing(
                  keyboardVisible
                    ? isVerySmallDevice
                      ? 8
                      : 12
                    : isVerySmallDevice
                      ? 12
                      : 16,
                ),
              }}
            >
              <Animated.View
                className="items-center"
                style={{
                  opacity: entranceAnim,
                  transform: [
                    {
                      translateY: entranceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                  marginBottom: getSpacing(keyboardVisible ? 10 : 16),
                }}
              >
                <Image
                  source={images.login}
                  resizeMode="contain"
                  style={{
                    width: keyboardVisible
                      ? getImageSize().width * 0.72
                      : getImageSize().width,
                    height: keyboardVisible
                      ? getImageSize().height * 0.72
                      : getImageSize().height,
                    marginBottom: getSpacing(keyboardVisible ? 8 : 12),
                  }}
                />
                <Text
                  className="text-center text-secondary-200 font-psemibold"
                  style={{ fontSize: getFontSize(isTablet ? 28 : 24) }}
                >
                  Sign in to CheckUpp
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  opacity: entranceAnim,
                  transform: [
                    {
                      translateY: entranceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [24, 0],
                      }),
                    },
                  ],
                }}
              >
                <Formik
                  enableReinitialize
                  initialValues={{ email: initialEmail, password: "" }}
                  validationSchema={validationSchema}
                  onSubmit={handleSubmit}
                >
                  {({
                    handleChange,
                    handleSubmit,
                    values,
                    errors,
                    touched,
                  }) => (
                    <View style={{ gap: getSpacing(8) }}>
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

                      <View>
                        <FormField
                          title="Password"
                          value={values.password}
                          handleChangeText={handleChange("password")}
                          placeholder="Enter your password"
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

                      <View
                        className="justify-end flex-row"
                        style={{ marginTop: getSpacing(4) }}
                      >
                        <Link
                          href="/forgot-password"
                          className="text-secondary-200 font-psemibold underline"
                          style={{ fontSize: getFontSize(14) }}
                        >
                          Forgot your password?
                        </Link>
                      </View>

                      <View style={{ marginTop: getSpacing(16) }}>
                        {isSubmitting ? (
                          <View className="flex-row justify-center">
                            <ButtonLoadAnimation />
                          </View>
                        ) : (
                          <CustomButton
                            title="Sign In"
                            handlePress={handleSubmit}
                            containerStyles="bg-secondary rounded-full"
                            textStyles="text-black font-psemibold"
                          />
                        )}
                      </View>

                      <View
                        className="justify-center flex-row"
                        style={{ marginTop: getSpacing(16) }}
                      >
                        <Text
                          className="text-gray-700 font-pregular"
                          style={{ fontSize: getFontSize(14) }}
                        >
                          Don&apos;t have an account?{" "}
                        </Text>
                        <Link
                          href="/sign-up"
                          className="text-secondary font-psemibold"
                          style={{ fontSize: getFontSize(14) }}
                        >
                          Sign Up
                        </Link>
                      </View>
                    </View>
                  )}
                </Formik>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default SignIn;
