import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet, Platform } from "react-native";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  getProfileCompletionRoute,
  isProfileComplete,
} from "@/lib/auth/profileCompletion";

const TabsLayout = () => {
  const { user, isLoggedIn, loading, profileResolved } = useGlobalContext();
  const showPregnancyTab = user?.gender === "female";

  if (loading || (isLoggedIn && !profileResolved)) {
    return <LoadingSpinner visible text="Loading your profile..." />;
  }

  if (!isLoggedIn) {
    return <Redirect href="/onboard" />;
  }

  if (user && !isProfileComplete(user)) {
    return <Redirect href={getProfileCompletionRoute()} />;
  }

  return (
    <>
      <StatusBar style="auto" />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#F3F4F6",
            borderTopWidth: 1,
            borderTopColor: "#E5E7EB",
            height: Platform.OS === "ios" ? 85 : 75,
            paddingBottom: Platform.OS === "ios" ? 25 : 15,
            paddingTop: 10,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            position: "absolute",
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
          },
          tabBarActiveTintColor: "#FF9C01",
          tabBarInactiveTintColor: "#6B7280",
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: "Poppins-Medium",
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.activeIndicator} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="health-screening"
          options={{
            title: "Screenings",
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "pulse" : "pulse-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.activeIndicator} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="pregnancy-planner"
          options={{
            title: "Pregnancy",
            href: showPregnancyTab ? "/pregnancy-planner" : null,
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "flower" : "flower-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.activeIndicator} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Doc Wallet",
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "library" : "library-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.activeIndicator} />}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused, color }) => (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={focused ? "person" : "person-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.activeIndicator} />}
              </View>
            ),
          }}
        />
      </Tabs>
    </>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -28,
    width: 40,
    height: 3,
    backgroundColor: "#FF9C01",
    borderRadius: 2,
  },
});

export default TabsLayout;
