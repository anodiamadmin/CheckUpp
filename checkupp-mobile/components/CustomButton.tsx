import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

interface CustomButtonProps {
  title: string;
  handlePress?: () => void;
  containerStyles?: string;
  textStyles?: string;
  isLoading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPressIn?: () => void;
  onPressOut?: () => void;
  activeOpacity?: number;
}

const CustomButton = ({
  title,
  handlePress,
  containerStyles,
  textStyles,
  isLoading,
  disabled = false,
  leftIcon,
  rightIcon,
  onPressIn,
  onPressOut,
  activeOpacity = 0.8,
}: CustomButtonProps) => {
  const { width } = useWindowDimensions();
  const scale = (size: number) => (Math.min(width, 430) / 350) * size;
  const isBtnDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`rounded-xl justify-center items-center ${isBtnDisabled ? "opacity-50" : "opacity-100"} ${containerStyles ?? ""}`}
      style={{ minHeight: scale(50) }}
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={activeOpacity}
      disabled={isBtnDisabled}
    >
      <View className="flex-row items-center justify-center">
        {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
        <Text className={`font-psemibold text-lg ${textStyles ?? ""}`}>
          {title}
        </Text>
        {rightIcon ? <View className="ml-2">{rightIcon}</View> : null}
      </View>
    </TouchableOpacity>
  );
};

export default CustomButton;
