import React, { useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Animated, TouchableOpacity, View, Text } from "react-native";

interface ProfileOptionProps {
  icon: any;
  title: string;
  subtitle: string;
  onPress?: () => void;
  iconColor: string;
}

const ProfileOption = ({
  icon,
  title,
  subtitle,
  onPress,
  iconColor,
}: ProfileOptionProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        className="mb-2"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View
          className="bg-white p-4 rounded-2xl"
          style={{
            shadowColor: iconColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-row items-center">
            <View className={`bg-gray-50 p-3 rounded-xl`}>
              <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
            </View>
            <View className="flex-1 ml-4">
              <Text className="text-gray-900 font-pbold text-lg">{title}</Text>
              <Text className="text-gray-600 font-pregular text-sm mt-1">
                {subtitle}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#666"
            />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default ProfileOption;
