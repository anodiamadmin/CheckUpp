import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";

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
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

interface FormFieldProps {
  value: string;
  title?: string;
  keyboardType?: any;
  placeholder?: string;
  otherStyles?: string;
  autoCompleteType?: any;
  handleChangeText: (e: any) => void;
  disabled?: boolean;
  secureTextEntry?: boolean;
  compact?: boolean;
}

const FormField = ({
  title,
  value,
  placeholder,
  otherStyles,
  keyboardType,
  autoCompleteType,
  handleChangeText,
  disabled = false,
  secureTextEntry,
  compact = false,
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPasswordField = secureTextEntry === true || title === "Password";
  const shouldSecureTextEntry = isPasswordField ? !showPassword : false;

  return (
    <View
      className={`${otherStyles}`}
      style={{ marginBottom: verticalScale(compact ? 8 : 12) }}
    >
      {title && (
        <Text
          className={`text-black ${
            disabled ? "font-pregular" : "font-psemibold"
          }`}
          style={{
            fontSize: getFontSize(compact ? 13 : 14),
            marginBottom: verticalScale(compact ? 4 : 6),
          }}
        >
          {title}
        </Text>
      )}

      <View
        className={`border w-full bg-gray-50 rounded-xl items-center flex-row ${
          isFocused ? "border-secondary" : "border-gray-300"
        }`}
        style={{
          height: verticalScale(
            compact
              ? isVerySmallDevice
                ? 36
                : isSmallDevice
                  ? 40
                  : 44
              : isVerySmallDevice
                ? 40
                : isSmallDevice
                  ? 44
                  : 48,
          ),
          paddingHorizontal: scale(compact ? 10 : 12),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {!value && !isFocused && placeholder && (
          <Text
            className="absolute font-pregular"
            style={{
              fontSize: getFontSize(compact ? 14 : 15),
              color: "#9CA3AF",
              left: scale(compact ? 10 : 12),
              pointerEvents: "none",
            }}
          >
            {placeholder}
          </Text>
        )}

        <TextInput
          className="flex-1 text-black font-pmedium"
          value={value}
          placeholder=""
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={shouldSecureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoCompleteType}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          style={{
            fontSize: getFontSize(compact ? 14 : 15),
            color: disabled ? "#9CA3AF" : "#000",
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
        />

        {isPasswordField ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{
              padding: scale(compact ? 3 : 4),
              marginLeft: scale(compact ? 6 : 8),
            }}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={scale(20)}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

export default FormField;
