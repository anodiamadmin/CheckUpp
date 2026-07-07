import React from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  PixelRatio,
  ImageSourcePropType,
} from "react-native";

import FormField from "@/components/FormField";
import CustomButton from "@/components/CustomButton";

const { width, height } = Dimensions.get("window");

const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

const scale = (size: number) => (width / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.6);
  if (isSmallDevice) return verticalScale(size * 0.7);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.8);
};

const getImageSize = () => {
  if (isTablet) return { width: scale(236), height: scale(272) };
  if (isVerySmallDevice) return { width: scale(172), height: scale(198) };
  if (isSmallDevice) return { width: scale(188), height: scale(214) };
  return { width: scale(206), height: scale(232) };
};

interface AuthCodeStepFormProps {
  codeLabel: string;
  codePlaceholder: string;
  codeValue: string;
  description: string;
  disableEmail?: boolean;
  emailError?: string;
  emailValue: string;
  imageSource: ImageSourcePropType;
  isPrimaryLoading?: boolean;
  isSecondaryLoading?: boolean;
  onCodeChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
  primaryTitle: string;
  secondaryTitle: string;
  title: string;
  codeError?: string;
  compact?: boolean;
}

const AuthCodeStepForm = ({
  codeError,
  codeLabel,
  codePlaceholder,
  codeValue,
  description,
  emailError,
  emailValue,
  imageSource,
  isPrimaryLoading = false,
  isSecondaryLoading = false,
  onCodeChange,
  onEmailChange,
  onPrimaryPress,
  onSecondaryPress,
  primaryTitle,
  secondaryTitle,
  title,
  compact = false,
  disableEmail = false,
}: AuthCodeStepFormProps) => {
  const imageSize = getImageSize();

  return (
    <View
      className="w-full flex-1 justify-center"
      style={{
        paddingHorizontal: scale(16),
        paddingVertical: getSpacing(
          compact ? (isVerySmallDevice ? 10 : 14) : isVerySmallDevice ? 16 : 24,
        ),
      }}
    >
      <View
        className="items-center"
        style={{ marginBottom: getSpacing(compact ? 10 : 16) }}
      >
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{
            width: compact ? imageSize.width * 0.72 : imageSize.width,
            height: compact ? imageSize.height * 0.72 : imageSize.height,
            marginBottom: getSpacing(compact ? 8 : 12),
          }}
        />
        <Text
          className="text-center text-secondary-200 font-psemibold"
          style={{ fontSize: getFontSize(isTablet ? 28 : 24) }}
        >
          {title}
        </Text>
        <Text
          className="text-center text-gray-600 font-pregular"
          style={{
            fontSize: getFontSize(15),
            marginTop: getSpacing(compact ? 4 : 6),
            lineHeight: getFontSize(22),
          }}
        >
          {description}
        </Text>
      </View>

      <View style={{ gap: getSpacing(8) }}>
        <View>
          <FormField
            title="Email"
            value={emailValue}
            handleChangeText={onEmailChange}
            placeholder="Enter your email"
            keyboardType="email-address"
            compact
            disabled={disableEmail}
          />
          {emailError ? (
            <Text
              className="text-red-500 font-pregular"
              style={{
                fontSize: getFontSize(12),
                marginTop: verticalScale(2),
                marginLeft: scale(4),
              }}
            >
              {emailError}
            </Text>
          ) : null}
        </View>

        <View>
          <FormField
            title={codeLabel}
            value={codeValue}
            handleChangeText={onCodeChange}
            placeholder={codePlaceholder}
            keyboardType="number-pad"
            compact
          />
          {codeError ? (
            <Text
              className="text-red-500 font-pregular"
              style={{
                fontSize: getFontSize(12),
                marginTop: verticalScale(2),
                marginLeft: scale(4),
              }}
            >
              {codeError}
            </Text>
          ) : null}
        </View>

        <View style={{ marginTop: getSpacing(12), gap: getSpacing(8) }}>
          <CustomButton
            title={primaryTitle}
            handlePress={onPrimaryPress}
            containerStyles="bg-secondary rounded-full"
            textStyles="text-black font-psemibold"
            isLoading={isPrimaryLoading}
          />
          <CustomButton
            title={secondaryTitle}
            handlePress={onSecondaryPress}
            containerStyles="bg-white border border-gray-300 rounded-full"
            textStyles="text-gray-700 font-psemibold"
            isLoading={isSecondaryLoading}
          />
        </View>
      </View>
    </View>
  );
};

export default AuthCodeStepForm;
