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
import {
  ScrollView,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import * as Yup from "yup";
import { Formik } from "formik";
import { images } from "@/constants";
import FormField from "@/components/FormField";
import { useToast } from "@/components/ToastProvider";
import CustomButton from "@/components/CustomButton";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import ButtonLoadAnimation from "@/components/LoadButtonAnimation";
import React, { useState } from "react";
import { signUpWithApi } from "@/lib/auth/api";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  if (isVerySmallDevice) return { width: scale(182), height: scale(216) };
  if (isSmallDevice) return { width: scale(198), height: scale(232) };
  return { width: scale(224), height: scale(258) };
};

const SignUp = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const { keyboardVisible } = useAuthScreenKeyboard();
  const entranceAnim = useScreenEntrance();

  const validationSchema = Yup.object({
    firstName: Yup.string().required("First name is required"),
    lastName: Yup.string().required("Last name is required"),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email is required"),
    password: Yup.string()
      .min(8, "Password must be at least 8 characters long")
      .required("Password is required"),
  });

  const submit = async (values: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setIsSubmitting(true);

    try {
      await signUpWithApi(values);
      showToast(
        "Account created. Enter the verification code we emailed you.",
        "success",
      );
      router.push({
        pathname: "/verify-email",
        params: {
          email: values.email,
          source: "signup",
        },
      });
    } catch (error: any) {
      showToast(error.message || "Failed to create your account.", "error");
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
                      ? 10
                      : 14
                    : isVerySmallDevice
                      ? 16
                      : 24,
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
                  source={images.signup}
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
                  style={{
                    fontSize: getFontSize(isTablet ? 28 : 24),
                  }}
                >
                  Sign Up for CheckUpp
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
                  initialValues={{
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                  }}
                  validationSchema={validationSchema}
                  onSubmit={submit}
                >
                  {({ handleChange, handleSubmit, values, errors, touched }) => (
                    <View style={{ gap: getSpacing(8) }}>
                    {[
                      {
                        title: "First Name",
                        value: values.firstName,
                        handleChangeText: handleChange("firstName"),
                        placeholder: "Enter your first name",
                        name: "firstName" as keyof typeof values,
                      },
                      {
                        title: "Last Name",
                        value: values.lastName,
                        handleChangeText: handleChange("lastName"),
                        placeholder: "Enter your last name",
                        name: "lastName" as keyof typeof values,
                      },
                      {
                        title: "Email",
                        value: values.email,
                        handleChangeText: handleChange("email"),
                        keyboardType: "email-address",
                        placeholder: "Enter your email address",
                        name: "email" as keyof typeof values,
                      },
                      {
                        title: "Password",
                        value: values.password,
                        handleChangeText: handleChange("password"),
                        placeholder: "Enter your password",
                        name: "password" as keyof typeof values,
                      },
                    ].map((field, index) => (
                      <View key={index}>
                        <FormField
                          title={field.title}
                          value={field.value}
                          handleChangeText={field.handleChangeText}
                          placeholder={field.placeholder}
                          keyboardType={field.keyboardType}
                          compact
                        />
                        {touched[field.name] && errors[field.name] ? (
                          <Text
                            className="text-red-500 font-pregular"
                            style={{
                              fontSize: getFontSize(12),
                              marginTop: verticalScale(2),
                              marginLeft: scale(4),
                            }}
                          >
                            {errors[field.name]}
                          </Text>
                        ) : null}
                      </View>
                    ))}

                    <View style={{ marginTop: getSpacing(16) }}>
                      {isSubmitting ? (
                        <View className="flex-row justify-center">
                          <ButtonLoadAnimation />
                        </View>
                      ) : (
                        <CustomButton
                          title="Sign Up"
                          handlePress={handleSubmit}
                          containerStyles="bg-secondary rounded-full"
                          textStyles="text-black font-psemibold"
                        />
                      )}
                    </View>
                    </View>
                  )}
                </Formik>
              </Animated.View>

              <View
                className="justify-center flex-row"
                style={{ marginTop: getSpacing(16) }}
              >
                <Text
                  className="text-gray-700 font-pregular"
                  style={{ fontSize: getFontSize(14) }}
                >
                  Already have an account?{" "}
                </Text>
                <Link
                  href="/sign-in"
                  className="text-secondary font-psemibold"
                  style={{ fontSize: getFontSize(14) }}
                >
                  Sign In
                </Link>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default SignUp;
