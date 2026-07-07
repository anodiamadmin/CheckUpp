import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

const AuthLayout = () => {
  const sharedAuthStackOptions = {
    headerShown: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: Platform.OS === "ios",
    animationTypeForReplace: "push" as const,
    animation: Platform.select({
      ios: "default" as const,
      android: "fade_from_bottom" as const,
      default: "default" as const,
    }),
    contentStyle: {
      backgroundColor: "#F5F5F5",
    },
  };

  return (
    <>
      <Stack screenOptions={sharedAuthStackOptions}>
        <Stack.Screen
          name="sign-in"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sign-up"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="verify-email"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="verify-reset-code"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="onboard"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="dark" backgroundColor="#F5F5F5" />
    </>
  );
};

export default AuthLayout;
