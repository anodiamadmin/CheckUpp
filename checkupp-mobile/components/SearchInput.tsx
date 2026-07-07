import React, { useState } from "react";
import { router, usePathname } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Dimensions,
  PixelRatio,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "./ToastProvider";

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

interface SearchInputProps {
  initialQuery?: string;
  placeholderText?: string;
  otherStyles?: string;
}

const SearchInput = ({
  initialQuery,
  placeholderText,
  otherStyles,
}: SearchInputProps) => {
  const pathName = usePathname();
  const [query, setQuery] = useState(initialQuery || "");
  const [isFocused, setIsFocused] = useState(false);
  const { showToast } = useToast();

  const handleSearch = () => {
    if (!query.trim()) {
      return showToast("Please enter something to search", "info");
    }

    if (pathName.startsWith("/search")) {
      router.setParams({ query: query.trim() });
    } else {
      router.push(`/search/${query.trim()}`);
      setQuery("");
    }
  };

  return (
    <View
      className={`${otherStyles}`}
      style={{ marginBottom: verticalScale(12) }}
    >
      <View
        className={`border w-full bg-gray-50 rounded-xl items-center flex-row ${
          isFocused ? "border-secondary" : "border-gray-300"
        }`}
        style={{
          height: verticalScale(
            isVerySmallDevice ? 30 : isSmallDevice ? 34 : 38
          ),
          paddingHorizontal: scale(12),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        {/* Search Icon */}
        <View style={{ marginRight: scale(8) }}>
          <Ionicons
            name="search-outline"
            size={scale(18)}
            color={isFocused ? "#FF9C01" : "#9CA3AF"}
          />
        </View>

        {!query && !isFocused && placeholderText && (
          <Text
            className="absolute font-pregular"
            style={{
              fontSize: getFontSize(15),
              color: "#9CA3AF",
              left: scale(12 + 18 + 8),
              pointerEvents: "none",
            }}
          >
            {placeholderText}
          </Text>
        )}

        {/* Text Input */}
        <TextInput
          className="flex-1 text-black font-pmedium"
          value={query}
          placeholder=""
          onChangeText={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={{
            fontSize: getFontSize(15),
            includeFontPadding: false,
            textAlignVertical: "center",
          }}
        />

        {/* Search Button */}
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleSearch}
            activeOpacity={0.7}
            style={{
              padding: scale(4),
              marginLeft: scale(8),
            }}
          >
            <Ionicons
              name="arrow-forward-outline"
              size={scale(18)}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SearchInput;
