import React from "react";
import { TouchableOpacity, View, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// Responsive scaling
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;

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

// Star size calculation
const getStarSize = () => {
  if (isVerySmallDevice) return scale(18);
  if (isSmallDevice) return scale(20);
  if (isTablet) return scale(26);
  return scale(22);
};

interface StarRatingProps {
  rating: number | null;
  onChange: (rating: number) => void;
}

const StarRating = ({ rating, onChange }: StarRatingProps) => {
  const maxStars = 5;
  const starSize = getStarSize();

  return (
    <View
      className="flex-row"
      style={{
        gap: scale(3),
        marginTop: getSpacing(8),
      }}
    >
      {Array.from({ length: maxStars }, (_, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onChange(index + 1)}
          activeOpacity={0.7}
          style={{
            padding: scale(2),
          }}
        >
          <Ionicons
            name={rating && index < rating ? "star" : "star-outline"}
            size={starSize}
            color={rating && index < rating ? "#FFD700" : "#C0C0C0"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default StarRating;
