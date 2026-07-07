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
import { requestPasswordReset, verifyResetCode } from "@/lib/auth/api";

const { width } = Dimensions.get("window");

const guidelineBaseWidth = 350;
const scale = (size: number) => (width / guidelineBaseWidth) * size;

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  code: Yup.string()
    .matches(/^\d{6}$/, "Code must be exactly 6 digits")
    .required("Reset code is required"),
});

const VerifyResetCode = () => {
  const params = useLocalSearchParams<{ email?: string }>();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { keyboardVisible } = useAuthScreenKeyboard();

  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email],
  );

  const handleVerify = async (values: { email: string; code: string }) => {
    setIsSubmitting(true);

    try {
      await verifyResetCode(values.email, values.code);
      showToast(
        "Reset code verified. You can choose a new password now.",
        "success",
      );
      router.replace({
        pathname: "/reset-password",
        params: {
          email: values.email.trim(),
          code: values.code.trim(),
        },
      });
    } catch (error: any) {
      showToast(error.message || "Failed to verify reset code.", "error");
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
      await requestPasswordReset(trimmedEmail);
      showToast("If that account exists, we sent a new reset code.", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to send a new reset code.", "error");
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
                  title="Verify Reset Code"
                  description="Enter the six-digit reset code from your email before choosing a new password."
                  imageSource={images.forgotPassword}
                  emailValue={values.email}
                  onEmailChange={handleChange("email")}
                  emailError={touched.email ? errors.email : undefined}
                  disableEmail
                  codeLabel="Reset Code"
                  codePlaceholder="Enter the 6-digit code"
                  codeValue={values.code}
                  onCodeChange={handleChange("code")}
                  codeError={touched.code ? errors.code : undefined}
                  primaryTitle={isSubmitting ? "Verifying..." : "Verify Code"}
                  onPrimaryPress={() => handleSubmit()}
                  isPrimaryLoading={isSubmitting}
                  secondaryTitle={isResending ? "Sending..." : "Send New Code"}
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

export default VerifyResetCode;
