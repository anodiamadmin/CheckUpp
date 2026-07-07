import React from "react";
import { format } from "date-fns";
import { Feather, AntDesign, Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
  Easing,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
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
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

interface Reminder {
  id: string;
  type: string;
  dueDate: string;
}

interface ReminderItemProps {
  item: Reminder;
  onDelete: (id: string) => void;
}

const ReminderItem = ({ item, onDelete }: ReminderItemProps) => {
  const dueDateObj = new Date(item.dueDate);
  const formattedDate = format(dueDateObj, "dd MMM yyyy");
  const formattedTime = format(dueDateObj, "hh:mm a");
  const isScheduled = dueDateObj > new Date();

  const daysRemaining = isScheduled
    ? Math.ceil(
        (dueDateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  const daysPassed = !isScheduled
    ? Math.ceil(
        (new Date().getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;

  // Animation values
  const rotation = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  // Bell animation styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scaleAnim.value }],
  }));

  // Function to trigger ringing animation
  const triggerRinging = () => {
    rotation.value = withSequence(
      withTiming(-15, { duration: 80 }),
      withTiming(15, { duration: 80 }),
      withTiming(-12, { duration: 80 }),
      withTiming(12, { duration: 80 }),
      withTiming(-8, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(0, { duration: 80 }),
    );

    scaleAnim.value = withSequence(
      withTiming(1.1, { duration: 150, easing: Easing.bounce }),
      withTiming(1, { duration: 150 }),
    );
  };

  const getBorderColor = () => {
    if (!isScheduled) return "border-red-200";
    if (daysRemaining <= 1) return "border-orange-200";
    return "border-orange-100";
  };

  const getIconBackgroundColor = () => {
    if (!isScheduled) return "bg-red-50";
    if (daysRemaining <= 1) return "bg-orange-50";
    return "bg-amber-50";
  };

  const getStatusText = () => {
    if (!isScheduled) return `${daysPassed}d past due`;
    if (daysRemaining === 0) return "Today";
    if (daysRemaining === 1) return "Tomorrow";
    return `In ${daysRemaining} days`;
  };

  const getStatusStyle = () => {
    if (!isScheduled) return "bg-red-50 text-red-600";
    if (daysRemaining <= 1) return "bg-orange-50 text-orange-600";
    return "bg-green-50 text-green-600";
  };

  return (
    <TouchableOpacity
      onPress={triggerRinging}
      activeOpacity={0.7}
      style={{ marginBottom: getSpacing(2) }}
    >
      <View
        className={`bg-white rounded-lg  overflow-hidden border ${getBorderColor()}`}
        style={{ padding: scale(10) }}
      >
        <View className="flex-row items-start justify-between">
          <View
            className="flex-row items-center flex-1"
            style={{ gap: scale(8) }}
          >
            <View
              className={`rounded-full ${getIconBackgroundColor()} items-center justify-center`}
              style={{
                width: scale(32),
                height: scale(32),
              }}
            >
              <Animated.View style={animatedStyle}>
                <Feather
                  name="bell"
                  size={scale(16)}
                  color={!isScheduled ? "#F43F5E" : "#FF9C01"}
                />
              </Animated.View>
            </View>

            <View className="flex-1">
              <Text
                numberOfLines={1}
                className="font-psemibold text-gray-800"
                style={{ fontSize: getFontSize(13) }}
              >
                {item.type}
              </Text>

              <View
                className="flex-row items-center"
                style={{
                  marginTop: getSpacing(2),
                  gap: scale(4),
                }}
              >
                <View
                  className="flex-row items-center bg-gray-50 rounded-md"
                  style={{
                    paddingHorizontal: scale(4),
                    paddingVertical: scale(2),
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={scale(10)}
                    color="#6B7280"
                  />
                  <Text
                    className="font-pregular text-gray-500"
                    style={{
                      fontSize: getFontSize(9),
                      marginLeft: scale(2),
                    }}
                  >
                    {formattedTime}
                  </Text>
                </View>

                <View
                  className="flex-row items-center bg-gray-50 rounded-md"
                  style={{
                    paddingHorizontal: scale(4),
                    paddingVertical: scale(2),
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={scale(10)}
                    color="#6B7280"
                  />
                  <Text
                    className="font-pregular text-gray-500"
                    style={{
                      fontSize: getFontSize(9),
                      marginLeft: scale(2),
                    }}
                  >
                    {formattedDate}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Enhanced Status Badge */}
          <View
            className={`rounded-lg ${getStatusStyle().split(" ")[0]}`}
            style={{
              paddingHorizontal: scale(6),
              paddingVertical: scale(3),
            }}
          >
            <Text
              className={`font-pmedium ${getStatusStyle().split(" ")[1]}`}
              style={{ fontSize: getFontSize(8) }}
            >
              {getStatusText()}
            </Text>
          </View>
        </View>

        <View
          className="bg-gray-100"
          style={{
            height: 1,
            marginVertical: getSpacing(6),
          }}
        />

        <View className="flex-row justify-between items-center">
          <View className="flex-row">
            <TouchableOpacity
              className="flex-row items-center bg-red-50 border border-red-100 rounded-lg"
              style={{
                paddingHorizontal: scale(6),
                paddingVertical: scale(4),
              }}
              onPress={() => onDelete(item.id)}
              activeOpacity={0.7}
            >
              <AntDesign name="delete" size={scale(10)} color="#F43F5E" />
              <Text
                className="text-red-600 font-pmedium"
                style={{
                  fontSize: getFontSize(9),
                  marginLeft: scale(2),
                }}
              >
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ReminderItem;
