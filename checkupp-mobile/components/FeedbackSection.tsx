import StarRating from "@/components/StarRating";
import { Ionicons } from "@expo/vector-icons";
import { useToast } from "@/components/ToastProvider";
import React, { useState } from "react";
import { saveUserFeedback } from "@/lib/appwrite/feedback";
import { useGlobalContext } from "@/context/useAuthBootstrap";
import {
  Text,
  TextInput,
  View,
  Alert,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";

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

const FeedbackSection = () => {
  const { showToast } = useToast();
  const { userId } = useGlobalContext();
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please provide feedback before submitting.");
      return;
    }

    try {
      if (!userId) {
        showToast("User session unavailable. Please sign in again.", "error");
        return;
      }

      setIsSubmitting(true);

      const data = {
        userId,
        feedback,
        rating: rating || null,
      };

      await saveUserFeedback(data);

      showToast("Feedback submitted successfully!", "success");
      setFeedback("");
      setRating(null);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholderText =
    "Tell us what you think about the app, features you'd like to see, or any issues...";

  return (
    <View
      className="bg-white rounded-lg border border-gray-100"
      style={{
        padding: scale(10),
        marginBottom: getSpacing(12),
      }}
    >
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(8) }}
      >
        <View
          className="rounded-full bg-orange-50 items-center justify-center"
          style={{
            width: scale(28),
            height: scale(28),
          }}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={scale(14)}
            color="#FF9C01"
          />
        </View>
        <Text
          className="font-pmedium text-gray-900"
          style={{
            fontSize: getFontSize(13),
            marginLeft: scale(8),
          }}
        >
          Share Your Feedback
        </Text>
      </View>

      <Text
        className="font-pregular text-gray-600"
        style={{
          fontSize: getFontSize(10),
          lineHeight: getFontSize(14),
          marginBottom: getSpacing(12),
        }}
      >
        Your thoughts help us improve CheckUpp Health Passport for everyone.
      </Text>

      {/* Feedback Input - Using FormField approach */}
      <View style={{ marginBottom: getSpacing(12) }}>
        <Text
          className="font-pmedium text-gray-800"
          style={{
            fontSize: getFontSize(11),
            marginBottom: getSpacing(4),
          }}
        >
          Your Message
        </Text>
        <View
          className={`border w-full bg-gray-50 rounded-lg ${
            isFocused ? "border-secondary" : "border-gray-200"
          }`}
          style={{
            minHeight: verticalScale(
              isVerySmallDevice ? 60 : isSmallDevice ? 70 : 80,
            ),
            padding: scale(8),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            position: "relative",
          }}
        >
          {!feedback && !isFocused && (
            <Text
              className="absolute font-pregular"
              style={{
                fontSize: getFontSize(11),
                color: "#9CA3AF",
                top: scale(8),
                left: scale(8),
                pointerEvents: "none",
                lineHeight: getFontSize(15),
              }}
            >
              {placeholderText}
            </Text>
          )}

          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder=""
            multiline
            numberOfLines={isVerySmallDevice ? 3 : 4}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="text-gray-800 font-pregular"
            style={{
              fontSize: getFontSize(11),
              textAlignVertical: "top",
              flex: 1,
              includeFontPadding: false,
              minHeight: verticalScale(
                isVerySmallDevice ? 44 : isSmallDevice ? 54 : 64,
              ),
            }}
          />
        </View>
      </View>

      {/* Star Rating */}
      <View style={{ marginBottom: getSpacing(12) }}>
        <Text
          className="font-pmedium text-gray-800"
          style={{
            fontSize: getFontSize(11),
            marginBottom: getSpacing(4),
          }}
        >
          Rate Your Experience
        </Text>
        <StarRating rating={rating} onChange={setRating} />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmitFeedback}
        disabled={isSubmitting}
        className={`rounded-lg ${
          isSubmitting ? "bg-gray-300" : "bg-orange-400"
        }`}
        style={{
          paddingVertical: getSpacing(8),
          paddingHorizontal: scale(12),
        }}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center justify-center">
          {isSubmitting ? (
            <Ionicons name="hourglass" size={scale(12)} color="#9CA3AF" />
          ) : (
            <Ionicons name="send" size={scale(12)} color="white" />
          )}
          <Text
            className={`font-pmedium ${
              isSubmitting ? "text-gray-600" : "text-white"
            }`}
            style={{
              fontSize: getFontSize(11),
              marginLeft: scale(4),
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default FeedbackSection;
