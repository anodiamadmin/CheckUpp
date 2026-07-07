import React, { useRef, useMemo, useState } from "react";
import {
  Text,
  View,
  Image,
  Linking,
  Animated,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  PixelRatio,
  Platform,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { format } from "date-fns";
import { images } from "@/constants";
import LoadingSpinner from "@/components/LoadingSpinner";
import * as WebBrowser from "expo-web-browser";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import {
  EMPTY_SCREENING_OVERVIEW,
  ScreeningOverviewStatus,
  useScreeningOverview,
} from "@/lib/features/screenings/overview";
import useScreenEntrance from "@/lib/animation/useScreenEntrance";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

// Font scaling
const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

// Device detection
const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

// Responsive spacing
const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.5);
  if (isSmallDevice) return verticalScale(size * 0.6);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.8);
};

// Responsive image sizes
const getImageSize = (baseWidth: number, baseHeight: number) => {
  if (isTablet)
    return { width: scale(baseWidth * 1.2), height: scale(baseHeight * 1.2) };
  if (isVerySmallDevice)
    return { width: scale(baseWidth * 0.7), height: scale(baseHeight * 0.7) };
  if (isSmallDevice)
    return { width: scale(baseWidth * 0.8), height: scale(baseHeight * 0.8) };
  return { width: scale(baseWidth), height: scale(baseHeight) };
};

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  // Match your actual tab bar height from TabsLayout
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;

  // Add extra padding for safety
  const extraPadding = getSpacing(32);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0; // iOS safe area

  return tabBarHeight + extraPadding + safeAreaPadding;
};

export default function Home() {
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useScreenEntrance();
  const [scrollY] = useState(new Animated.Value(0));

  const router = useRouter();
  const animation = useRef(new Animated.Value(1)).current;
  const { user, userId } = useGlobalContext();
  const { data: overviewData, loading, refetch } = useScreeningOverview(userId);
  const overview = overviewData || EMPTY_SCREENING_OVERVIEW;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: "clamp",
  });

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.98],
    extrapolate: "clamp",
  });

  const onRefresh = async () => {
    setRefreshing(true);
    Animated.timing(animation, {
      toValue: 0.9,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      refetch().then(() => {
        setRefreshing(false);
        Animated.timing(animation, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    });
  };

  const greetingInfo = useMemo(() => {
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
      return {
        message: "Good Morning!",
        icon: "weather-sunny",
        color: "#FF9C01",
        gradient: ["#00CED1", "#20B2AA"],
      };
    } else if (currentHour < 18) {
      return {
        message: "Good Afternoon!",
        icon: "white-balance-sunny",
        color: "#FF9C01",
        gradient: ["#00CED1", "#20B2AA"],
      };
    } else {
      return {
        message: "Good Evening!",
        icon: "weather-night",
        color: "#FF9C01",
        gradient: ["#00CED1", "#20B2AA"],
      };
    }
  }, []);

  const handleNavigateToScreenings = (tab = "cancer") => {
    router.push({
      pathname: "/health-screening",
      params: { initialTab: tab },
    });
  };

  const completionPercentage =
    overview.totalScreenings > 0
      ? Math.floor(
          (overview.completedScreenings / overview.totalScreenings) * 100,
        )
      : 0;

  const overviewStatus: ScreeningOverviewStatus =
    loading && !refreshing ? "loading" : overview.status;

  const formatScreeningDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const differenceInMonths = Math.floor(
        (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );

      if (differenceInMonths < 1) {
        return "This month";
      } else if (differenceInMonths === 1) {
        return "Next month";
      } else {
        return format(date, "MMM yyyy");
      }
    } catch {
      return dateString;
    }
  };

  // Get user's first name for greeting
  const getUserFirstName = () => {
    if (!user?.name) return "there";
    return user.name.split(" ")[0];
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00CED1"
              colors={["#00CED1"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
        >
          {/* Compact Header */}
          <Animated.View
            style={[
              {
                transform: [
                  { translateY: headerTranslateY },
                  { scale: headerScale },
                ],
              },
              {
                paddingHorizontal: scale(12),
                paddingTop: getSpacing(8),
                paddingBottom: getSpacing(4),
              },
            ]}
          >
            <LinearGradient
              colors={greetingInfo.gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl overflow-hidden"
              style={{
                paddingHorizontal: scale(16),
                paddingVertical: getSpacing(16),
                marginBottom: getSpacing(12),
                shadowColor: "#00CED1",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              {/* Background Pattern */}
              <View className="absolute inset-0 opacity-20">
                <View
                  className="absolute bg-white/30 rounded-full"
                  style={{
                    top: scale(8),
                    right: scale(16),
                    width: scale(60),
                    height: scale(60),
                  }}
                />
                <View
                  className="absolute bg-white/20 rounded-full"
                  style={{
                    top: -scale(12),
                    right: scale(48),
                    width: scale(36),
                    height: scale(36),
                  }}
                />
              </View>

              <View className="flex-row items-center justify-between relative">
                <View className="flex-1">
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(4) }}
                  >
                    <MaterialCommunityIcons
                      name={greetingInfo.icon as any}
                      size={scale(18)}
                      color="#FF9C01"
                    />
                    <Text
                      className="text-yellow-400 font-pbold ml-2"
                      style={{ fontSize: getFontSize(isTablet ? 20 : 16) }}
                    >
                      {greetingInfo.message}
                    </Text>
                  </View>

                  <Text
                    className="text-white/90 font-pmedium"
                    style={{
                      fontSize: getFontSize(14),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Welcome back, {getUserFirstName()}
                  </Text>
                  <Text
                    className="text-white/80 font-pregular"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    Let&apos;s stay on top of your health journey
                  </Text>
                </View>

                <View
                  className="bg-white/20 backdrop-blur-sm rounded-2xl"
                  style={{ padding: scale(8) }}
                >
                  <Image
                    source={images.checkupp_home}
                    style={getImageSize(72, 48)}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Stats Overview */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
              marginHorizontal: scale(16),
              marginBottom: getSpacing(20),
            }}
          >
            <View
              className="bg-white rounded-xl border border-gray-100"
              style={{
                padding: scale(16),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View
                className="flex-row items-center justify-between"
                style={{ marginBottom: getSpacing(16) }}
              >
                <View>
                  <Text
                    className="font-psemibold text-black"
                    style={{ fontSize: getFontSize(16) }}
                  >
                    Your Health Overview
                  </Text>
                  <Text
                    className="font-pregular text-gray-500"
                    style={{
                      fontSize: getFontSize(10),
                      marginTop: verticalScale(2),
                    }}
                  >
                    {overviewStatus === "loading" && "Loading overview..."}
                    {overviewStatus === "local" && "Loaded from device cache"}
                    {overviewStatus === "server" && "Loaded from cloud backup"}
                    {overviewStatus === "pending-sync" &&
                      "Pending sync from this device"}
                    {overviewStatus === "empty" &&
                      "No screening data available yet"}
                    {overviewStatus === "error" &&
                      "Could not load overview data"}
                  </Text>
                </View>
                <View
                  className="bg-gray-50 rounded-lg px-2 py-1"
                  style={{
                    paddingHorizontal: scale(8),
                    paddingVertical: scale(4),
                  }}
                >
                  <Text
                    className="font-pmedium text-gray-600"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    {overview.completedScreenings}/{overview.totalScreenings}
                  </Text>
                </View>
              </View>

              <View className="flex-row" style={{ gap: scale(12) }}>
                <View className="flex-1">
                  <View
                    className="bg-gray-50 rounded-lg"
                    style={{ padding: scale(12), marginBottom: getSpacing(8) }}
                  >
                    <View className="flex-row items-center justify-between">
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={scale(20)}
                        color="#10B981"
                      />
                      <Text
                        className="font-pbold text-black"
                        style={{ fontSize: getFontSize(24) }}
                      >
                        {completionPercentage}%
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(13),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Completed
                  </Text>
                  <Text
                    className="font-pregular text-gray-500"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Health progress
                  </Text>
                </View>

                <View className="flex-1">
                  <View
                    className="bg-gray-50 rounded-lg"
                    style={{ padding: scale(12), marginBottom: getSpacing(8) }}
                  >
                    <View className="flex-row items-center justify-between">
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={scale(20)}
                        color="#FF9C01"
                      />
                      <Text
                        className="font-pbold text-black"
                        style={{ fontSize: getFontSize(24) }}
                      >
                        {overview.upcomingScreenings.length}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(13),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Upcoming
                  </Text>
                  <Text
                    className="font-pregular text-gray-500"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    {overview.upcomingScreenings.length > 0
                      ? "Action needed"
                      : "Up to date"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
              marginHorizontal: scale(16),
              marginBottom: getSpacing(20),
            }}
          >
            <Text
              className="font-psemibold text-black"
              style={{
                fontSize: getFontSize(16),
                marginBottom: getSpacing(12),
              }}
            >
              Quick Actions
            </Text>

            <View style={{ gap: getSpacing(10) }}>
              <TouchableOpacity
                onPress={() => handleNavigateToScreenings("cancer")}
                className="bg-white rounded-lg border border-gray-100"
                activeOpacity={0.7}
                style={{
                  padding: scale(14),
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(10),
                    marginRight: scale(12),
                    backgroundColor: "#F4433615",
                  }}
                >
                  <MaterialCommunityIcons
                    name="radiology-box-outline"
                    size={scale(20)}
                    color="#F44336"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(14),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Cancer Screenings
                  </Text>
                  <Text
                    className="text-gray-500 font-pregular"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Cervical, breast, bowel, prostate & lung
                  </Text>
                </View>
                <View
                  className="rounded-lg"
                  style={{ padding: scale(6), backgroundColor: "#F4433610" }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={scale(16)}
                    color="#F44336"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleNavigateToScreenings("health")}
                className="bg-white rounded-lg border border-gray-100"
                activeOpacity={0.7}
                style={{
                  padding: scale(14),
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(10),
                    marginRight: scale(12),
                    backgroundColor: "#2196F315",
                  }}
                >
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={scale(20)}
                    color="#2196F3"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(14),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Health Checkups
                  </Text>
                  <Text
                    className="text-gray-500 font-pregular"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Cardiovascular, diabetes, vision, dental & mental
                  </Text>
                </View>
                <View
                  className="rounded-lg"
                  style={{ padding: scale(6), backgroundColor: "#2196F310" }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={scale(16)}
                    color="#2196F3"
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/immunization")}
                className="bg-white rounded-lg border border-gray-100"
                activeOpacity={0.7}
                style={{
                  padding: scale(14),
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(10),
                    marginRight: scale(12),
                    backgroundColor: "#10B98115",
                  }}
                >
                  <MaterialCommunityIcons
                    name="needle"
                    size={scale(20)}
                    color="#10B981"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(14),
                      marginBottom: verticalScale(2),
                    }}
                  >
                    Immunization Checkups
                  </Text>
                  <Text
                    className="text-gray-500 font-pregular"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Routine, travel, occupational & boosters
                  </Text>
                </View>
                <View
                  className="rounded-lg"
                  style={{ padding: scale(6), backgroundColor: "#10B98110" }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={scale(16)}
                    color="#10B981"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Upcoming Screenings */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              marginBottom: getSpacing(20),
            }}
          >
            <View
              className="flex-row justify-between items-center"
              style={{
                marginBottom: getSpacing(12),
                marginHorizontal: scale(16),
              }}
            >
              <Text
                className="font-psemibold text-black"
                style={{ fontSize: getFontSize(16) }}
              >
                Upcoming Screenings
              </Text>
              {overview.upcomingScreenings.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleNavigateToScreenings()}
                  className="bg-gray-50 rounded-lg"
                  style={{
                    paddingHorizontal: scale(10),
                    paddingVertical: scale(6),
                  }}
                >
                  <Text
                    className="text-black font-pmedium"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    View All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {overview.upcomingScreenings.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: scale(16),
                  paddingRight: scale(16),
                }}
                decelerationRate="fast"
              >
                {overview.upcomingScreenings.map((screening: any, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() =>
                      handleNavigateToScreenings(screening.screeningType)
                    }
                    className="bg-white rounded-lg border border-gray-100"
                    style={{
                      width: width * 0.72,
                      marginRight: scale(12),
                      padding: scale(14),
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      className="flex-row items-start"
                      style={{ marginBottom: getSpacing(12) }}
                    >
                      <View
                        className="rounded-lg"
                        style={{
                          padding: scale(8),
                          marginRight: scale(10),
                          backgroundColor:
                            screening.screeningType === "cancer"
                              ? "#F4433615"
                              : "#2196F315",
                        }}
                      >
                        <MaterialCommunityIcons
                          name={
                            screening.screeningType === "cancer"
                              ? "radiology-box-outline"
                              : "heart-pulse"
                          }
                          size={scale(18)}
                          color={
                            screening.screeningType === "cancer"
                              ? "#F44336"
                              : "#2196F3"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="font-pmedium text-black"
                          style={{
                            fontSize: getFontSize(14),
                            marginBottom: verticalScale(2),
                          }}
                        >
                          {screening.name}
                        </Text>
                        <Text
                          className="text-gray-500 font-pregular"
                          style={{ fontSize: getFontSize(11) }}
                        >
                          {screening.screeningType === "cancer"
                            ? "Cancer Screening"
                            : "Health Check"}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="flex-row items-center bg-gray-50 rounded-lg"
                      style={{
                        padding: scale(8),
                        marginBottom: getSpacing(10),
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={scale(14)}
                        color="#6B7280"
                      />
                      <Text
                        className="text-gray-600 font-pmedium ml-2"
                        style={{ fontSize: getFontSize(12) }}
                      >
                        {formatScreeningDate(screening.date)}
                      </Text>
                    </View>

                    {screening.recommended && (
                      <View
                        className="bg-orange-50 border border-orange-200 rounded-lg"
                        style={{
                          paddingHorizontal: scale(8),
                          paddingVertical: scale(6),
                          marginBottom: getSpacing(10),
                        }}
                      >
                        <View className="flex-row items-center">
                          <MaterialCommunityIcons
                            name="star"
                            size={scale(12)}
                            color="#FF9C01"
                          />
                          <Text
                            className="text-black font-pmedium ml-2"
                            style={{ fontSize: getFontSize(11) }}
                          >
                            Priority Screening
                          </Text>
                        </View>
                      </View>
                    )}

                    <View
                      className="flex-row items-center justify-between border-t border-gray-100"
                      style={{ paddingTop: getSpacing(10) }}
                    >
                      <Text
                        className="font-pmedium text-black"
                        style={{ fontSize: getFontSize(12) }}
                      >
                        View Details
                      </Text>
                      <View
                        className="rounded-lg"
                        style={{
                          padding: scale(4),
                          backgroundColor:
                            screening.screeningType === "cancer"
                              ? "#F4433610"
                              : "#2196F310",
                        }}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={scale(14)}
                          color={
                            screening.screeningType === "cancer"
                              ? "#F44336"
                              : "#2196F3"
                          }
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View
                className="bg-white rounded-lg border border-gray-100"
                style={{
                  marginHorizontal: scale(16),
                  padding: scale(20),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View className="items-center">
                  <View
                    className="bg-gray-50 rounded-lg"
                    style={{
                      padding: scale(16),
                      marginBottom: getSpacing(12),
                    }}
                  >
                    <MaterialCommunityIcons
                      name="calendar-check-outline"
                      size={scale(28)}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text
                    className="text-black font-psemibold text-center"
                    style={{
                      fontSize: getFontSize(15),
                      marginBottom: getSpacing(4),
                    }}
                  >
                    No upcoming screenings
                  </Text>
                  <Text
                    className="text-gray-500 font-pregular text-center"
                    style={{
                      fontSize: getFontSize(12),
                      lineHeight: getFontSize(16),
                    }}
                  >
                    Set up your health checks using Quick Actions above to see
                    personalized recommendations
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Health Insights */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
              marginHorizontal: scale(16),
              marginBottom: getSpacing(20),
            }}
          >
            <Text
              className="font-psemibold text-black"
              style={{
                fontSize: getFontSize(16),
                marginBottom: getSpacing(12),
              }}
            >
              Health Insights
            </Text>
            <View
              className="bg-white rounded-lg border border-gray-100"
              style={{
                padding: scale(16),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(12) }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(8),
                    marginRight: scale(10),
                    backgroundColor: "#FF9C0115",
                  }}
                >
                  <Ionicons name="bulb" size={scale(18)} color="#FF9C01" />
                </View>
                <Text
                  className="font-pmedium text-black"
                  style={{ fontSize: getFontSize(15) }}
                >
                  Did You Know?
                </Text>
              </View>

              <Text
                className="text-gray-600 font-pregular"
                style={{
                  fontSize: getFontSize(12),
                  marginBottom: getSpacing(12),
                  lineHeight: getFontSize(16),
                }}
              >
                Regular health checks can detect health issues before they
                start. Early detection gives you the best chance for getting the
                right treatment quickly.
              </Text>

              <View
                className="bg-gray-50 rounded-lg"
                style={{ padding: scale(12) }}
              >
                <View
                  className="flex-row items-center"
                  style={{ marginBottom: getSpacing(6) }}
                >
                  <MaterialCommunityIcons
                    name="clock-time-four"
                    size={scale(14)}
                    color="#6B7280"
                  />
                  <Text
                    className="text-black font-pmedium ml-2"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    Health Reminder
                  </Text>
                </View>
                <Text
                  className="text-gray-500 font-pregular"
                  style={{
                    fontSize: getFontSize(11),
                    lineHeight: getFontSize(15),
                  }}
                >
                  Everyone should routinely visit their GP annually for a
                  check-up.{"\n\n"}
                  An annual visit to your GP is a proactive step to maintain
                  your health, not just address illness. It allows for essential
                  preventive care, including screenings for conditions like high
                  blood pressure, high cholesterol, or certain cancers which are
                  most treatable when caught early. This regular check-up also
                  helps update vaccinations, manage ongoing prescriptions, and
                  build a trusted relationship with a doctor who understands
                  your personal and family medical history, enabling better,
                  more personalised care over your lifetime.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Health Resources */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [55, 0],
                  }),
                },
              ],
              marginHorizontal: scale(16),
            }}
          >
            <Text
              className="font-psemibold text-black"
              style={{
                fontSize: getFontSize(16),
                marginBottom: getSpacing(12),
              }}
            >
              Health Resources
            </Text>

            <TouchableOpacity
              className="bg-white rounded-lg border border-gray-100 flex-row items-center"
              activeOpacity={0.7}
              onPress={() => {
                WebBrowser.openBrowserAsync("https://www.healthdirect.gov.au");
              }}
              style={{
                padding: scale(14),
                marginBottom: getSpacing(12),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View
                className="rounded-lg"
                style={{
                  padding: scale(10),
                  marginRight: scale(12),
                  backgroundColor: "#00CED115",
                }}
              >
                <MaterialCommunityIcons
                  name="web"
                  size={scale(20)}
                  color="#00CED1"
                />
              </View>
              <View className="flex-1">
                <Text
                  className="text-black font-pmedium"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: verticalScale(2),
                  }}
                >
                  Healthdirect Australia
                </Text>
                <Text
                  className="text-gray-500 font-pregular"
                  style={{ fontSize: getFontSize(11) }}
                >
                  Free health advice and information • 24/7 support
                </Text>
              </View>
              <View
                className="rounded-lg"
                style={{ padding: scale(6), backgroundColor: "#00CED110" }}
              >
                <Ionicons
                  name="open-outline"
                  size={scale(16)}
                  color="#00CED1"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Emergency Services */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
              marginHorizontal: scale(16),
              marginBottom: getSpacing(32),
            }}
          >
            <TouchableOpacity
              className="bg-red-50 rounded-lg border border-red-100"
              activeOpacity={0.7}
              onPress={() => {
                Linking.openURL("tel:112");
              }}
              style={{
                padding: scale(14),
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                className="bg-white rounded-lg"
                style={{ padding: scale(10), marginRight: scale(12) }}
              >
                <Feather name="phone" size={scale(18)} color="#EF4444" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-red-600 font-pmedium"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: verticalScale(2),
                  }}
                >
                  Emergency Services
                </Text>
                <Text
                  className="text-red-500 font-pregular"
                  style={{ fontSize: getFontSize(11) }}
                >
                  Call 112 for medical emergencies
                </Text>
              </View>
              <View
                className="rounded-lg"
                style={{ padding: scale(6), backgroundColor: "#EF444410" }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={scale(16)}
                  color="#EF4444"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.ScrollView>
      </SafeAreaView>
      <LoadingSpinner visible={loading && !refreshing} />
    </GestureHandlerRootView>
  );
}
