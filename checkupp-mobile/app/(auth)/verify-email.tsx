import React, { useMemo, useState } from "react";
import {
  View,
  Platform,
  Dimensions,
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

import { images } from "@/constants";
import { useToast } from "@/components/ToastProvider";
import AuthCodeStepForm from "@/components/auth/AuthCodeStepForm";
import { useAuthScreenKeyboard } from "@/components/auth/useAuthScreenKeyboard";
import { ApiClientError } from "@/lib/api/client";
import { sendVerificationCode, verifyUserCode } from "@/lib/auth/api";

const { width } = Dimensions.get("window");

const guidelineBaseWidth = 350;

const scale = (size: number) => (width / guidelineBaseWidth) * size;

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  code: Yup.string()
    .matches(/^\d{6}$/, "Code must be exactly 6 digits")
    .required("Verification code is required"),
});

const VerifyEmail = () => {
  const params = useLocalSearchParams<{ email?: string; source?: string }>();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { keyboardVisible } = useAuthScreenKeyboard();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email],
  );

  const isFromSignIn = params.source === "signin";

  const handleVerify = async (values: { email: string; code: string }) => {
    setIsSubmitting(true);

    try {
      await verifyUserCode(values.email, values.code);
      showToast("Email verified successfully. You can sign in now.", "success");
      router.replace({
        pathname: "/sign-in",
        params: {
          email: values.email,
        },
      });
    } catch (error: any) {
      showToast(error.message || "Failed to verify code.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast(
        "Enter your email address before requesting a new code.",
        "error",
      );
      return;
    }

    setIsResending(true);

    try {
      await sendVerificationCode(trimmedEmail);
      showToast("A new verification code has been sent.", "success");
    } catch (error: any) {
      if (error instanceof ApiClientError) {
        if (
          error.status === 400 &&
          error.message === "User is already verified"
        ) {
          showToast("This email is already verified. Please sign in.", "info");
          router.replace({
            pathname: "/sign-in",
            params: {
              email: trimmedEmail,
            },
          });
          return;
        }

        if (error.status === 404) {
          showToast(
            "We could not find that account. Please sign up again.",
            "error",
          );
          router.replace("/sign-up");
          return;
        }
      }

      showToast(
        error.message || "Failed to resend verification code.",
        "error",
      );
    } finally {
      setIsResending(false);
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
            <Formik
              enableReinitialize
              initialValues={{ email: initialEmail, code: "" }}
              validationSchema={validationSchema}
              onSubmit={handleVerify}
            >
              {({ handleChange, handleSubmit, values, errors, touched }) => (
                <AuthCodeStepForm
                  title="Verify Your Email"
                  description={
                    isFromSignIn
                      ? "Enter the six-digit code linked to your account so you can finish signing in."
                      : "Enter the six-digit code we sent to your inbox to finish creating your account."
                  }
                  imageSource={images.signup}
                  emailValue={values.email}
                  onEmailChange={handleChange("email")}
                  emailError={touched.email ? errors.email : undefined}
                  codeLabel="Verification Code"
                  codePlaceholder="Enter the 6-digit code"
                  codeValue={values.code}
                  onCodeChange={handleChange("code")}
                  codeError={touched.code ? errors.code : undefined}
                  primaryTitle={isSubmitting ? "Verifying..." : "Verify Email"}
                  onPrimaryPress={() => handleSubmit()}
                  isPrimaryLoading={isSubmitting}
                  secondaryTitle={isResending ? "Sending..." : "Resend Code"}
                  onSecondaryPress={() => handleResend(values.email)}
                  isSecondaryLoading={isResending}
                  compact={keyboardVisible}
                />
              )}
            </Formik>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default VerifyEmail;
