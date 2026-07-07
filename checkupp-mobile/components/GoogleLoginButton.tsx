import React, { useRef, useState } from "react";
import {
  Image,
  Animated,
  ActivityIndicator,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { images } from "@/constants";
import { useToast } from "@/components/ToastProvider";
import { ApiClientError, apiConfig } from "@/lib/api/client";
import {
  getCurrentUserProfile,
  primeAuthenticatedUserData,
  signInWithSocialProvider,
} from "@/lib/auth/api";
import { getReadableGoogleSignInErrorMessage } from "../lib/auth/errorMessages";
import { getPostAuthRoute } from "@/lib/auth/profileCompletion";
import CustomButton from "@/components/CustomButton";

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

const getGoogleConfigurationError = () => {
  if (!webClientId?.trim()) {
    return "Google sign-in is not configured. Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.";
  }

  return null;
};

let googleConfigured = false;
export function configureGoogleSignIn() {
  const configurationError = getGoogleConfigurationError();

  if (configurationError) {
    console.warn("Google sign-in configuration skipped:", {
      configurationError,
      platform: "mobile",
      apiBaseUrl: apiConfig.baseUrl,
    });
    return;
  }

  if (!googleConfigured) {
    GoogleSignin.configure({
      ...(iosClientId ? { iosClientId } : {}),
      webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    googleConfigured = true;
  }
}

interface GoogleLoginButtonProps {
  title?: string;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

const GoogleLoginButton = ({
  title,
  containerStyles,
  textStyles,
  isLoading,
  disabled = false,
}: GoogleLoginButtonProps) => {
  const { width } = useWindowDimensions();
  const scale = (size: number) => (Math.min(width, 430) / 350) * size;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [buttonLoading, setButtonLoading] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleGoogleSignIn = async () => {
    const configurationError = getGoogleConfigurationError();

    if (configurationError) {
      showToast(configurationError, "error");
      return;
    }

    setButtonLoading(true);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type !== "success") {
        showToast("Google sign-in was cancelled.", "info");
        return;
      }

      const tokens = await GoogleSignin.getTokens();
      const idToken = signInResult.data.idToken ?? tokens.idToken;

      if (!idToken) {
        throw new Error("Google did not return an ID token. Please try again.");
      }

      await signInWithSocialProvider({
        provider: "google",
        idToken,
        accessToken: tokens.accessToken,
      });

      const profile = await getCurrentUserProfile();
      if (!profile) {
        throw new Error("Unable to load your profile after Google sign-in.");
      }

      void primeAuthenticatedUserData(profile);
      await queryClient.invalidateQueries({ queryKey: ["auth"], exact: false });
      showToast("Signed in successfully!", "success");
      router.replace(getPostAuthRoute(profile));
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        showToast("Google sign-in was cancelled.", "info");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        showToast("Google sign-in already in progress.", "error");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showToast("Google Play Services not available or outdated.", "error");
      } else if (error instanceof ApiClientError) {
        showToast(getReadableGoogleSignInErrorMessage(error), "error");
        console.error("Google backend sign-in error:", {
          code: error.code,
          status: error.status,
          details: error.details,
          baseUrl: apiConfig.baseUrl,
        });
      } else {
        showToast(
          "Google sign-in is unavailable right now. Please try again.",
          "error",
        );
        console.error("Google sign-in error:", {
          message: error?.message,
          code: error?.code,
          baseUrl: apiConfig.baseUrl,
        });
      }
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: buttonScale }],
      }}
    >
      <CustomButton
        title={
          buttonLoading || isLoading
            ? "Signing in..."
            : title || "Sign in with Google"
        }
        handlePress={handleGoogleSignIn}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        containerStyles={`w-full rounded-full bg-white border border-gray-300 ${containerStyles ?? ""}`}
        textStyles={`text-gray-700 font-psemibold text-base ${textStyles ?? ""}`}
        isLoading={isLoading || buttonLoading}
        disabled={disabled}
        leftIcon={
          <View
            style={{
              width: scale(26),
              height: scale(26),
              borderRadius: scale(13),
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F9FAFB",
            }}
          >
            <Image
              source={images.googleImage}
              style={{
                width: scale(16),
                height: scale(16),
              }}
              resizeMode="contain"
            />
          </View>
        }
        rightIcon={
          buttonLoading || isLoading ? (
            <ActivityIndicator size="small" color="#777" />
          ) : undefined
        }
      />
    </Animated.View>
  );
};

export default GoogleLoginButton;
