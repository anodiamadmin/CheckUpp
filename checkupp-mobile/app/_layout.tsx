import { QueryClientProvider } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { useAuthBootstrap } from "@/context/useAuthBootstrap";
import { ToastProvider } from "@/components/ToastProvider";
import { queryClient } from "@/lib/query/client";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { configureGoogleSignIn } from "@/components/GoogleLoginButton";
import * as NavigationBar from "expo-navigation-bar";
import { Platform } from "react-native";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAuthBootstrap();

  const [fontsLoaded, error] = useFonts({
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
  });

  useEffect(() => {
    if (error) throw error;

    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, error]);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("hidden").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  if (!fontsLoaded && !error) {
    return null;
  }

  const sharedStackOptions = {
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
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={sharedStackOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="help/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="search/[query]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="privacy/index" options={{ headerShown: false }} />
          <Stack.Screen
            name="terms-of-service/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="personal-details/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="reminders/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="consent-requests/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="immunization/index"
            options={{ headerShown: false }}
          />
        </Stack>
        <StatusBar style="dark" backgroundColor="transparent" />
      </QueryClientProvider>
      <Toast />
    </ToastProvider>
  );
}
