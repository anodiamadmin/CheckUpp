import React from "react";
import { View, Text } from "react-native";

interface InfoBoxProps {
  title: string;
  subTitle?: string;
  containerStyles?: string;
  titleStyles?: string;
  subtitleStyles?: string;
}

const InfoBox = ({
  title,
  subTitle,
  containerStyles,
  titleStyles,
  subtitleStyles,
}: InfoBoxProps) => {
  return (
    <View className={containerStyles}>
      <Text className={`text-white text-center font-psemibold ${titleStyles}`}>
        {title}
      </Text>
      <Text
        className={`text-sm text-gray-100 text-center font-pregular ${subtitleStyles}`}
      >
        {subTitle}
      </Text>
    </View>
  );
};

export default InfoBox;
