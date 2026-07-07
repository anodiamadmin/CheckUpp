import {
  View,
  Text,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PixelRatio,
} from "react-native";
import React, { useState, useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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

interface AddReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onAddReminder: (type: string, dueDate: string, status: string) => void;
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({
  visible,
  onClose,
  onAddReminder,
}) => {
  const [type, setType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [screenWidth, setScreenWidth] = useState(width);

  // Handle screen dimension changes
  useEffect(() => {
    const dimensionsHandler = Dimensions.addEventListener(
      "change",
      ({ window }) => {
        setScreenWidth(window.width);
      }
    );

    return () => dimensionsHandler.remove();
  }, []);

  // Calculate dynamic widths based on screen size
  const getModalWidth = () => {
    if (isVerySmallDevice) return screenWidth * 0.9;
    if (isSmallDevice) return screenWidth * 0.85;
    if (isTablet) return Math.min(screenWidth * 0.6, scale(400));
    return screenWidth * 0.85;
  };

  const handleSubmit = () => {
    if (!type || !dueDate) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }

    onAddReminder(type, dueDate, status);
    setType("");
    setDueDate("");
    setStatus("Pending");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <GestureHandlerRootView className="flex-1 justify-center items-center bg-gray-800 bg-opacity-60">
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View
              className="bg-white rounded-lg shadow-xl"
              style={{
                width: getModalWidth(),
                maxWidth: "95%",
                padding: scale(16),
              }}
            >
              <Text
                className="font-psemibold text-center text-gray-800"
                style={{
                  fontSize: getFontSize(16),
                  marginBottom: getSpacing(12),
                }}
              >
                Add New Reminder
              </Text>

              <TextInput
                placeholder="Reminder Type"
                value={type}
                onChangeText={setType}
                className="border border-gray-300 rounded-lg text-gray-800 font-pregular"
                style={{
                  padding: scale(8),
                  marginBottom: getSpacing(8),
                  fontSize: getFontSize(12),
                }}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                placeholder="Due Date (YYYY-MM-DD)"
                value={dueDate}
                onChangeText={setDueDate}
                className="border border-gray-300 rounded-lg text-gray-800 font-pregular"
                style={{
                  padding: scale(8),
                  marginBottom: getSpacing(8),
                  fontSize: getFontSize(12),
                }}
                placeholderTextColor="#9CA3AF"
              />

              <View
                className="flex-row justify-between"
                style={{
                  marginBottom: getSpacing(12),
                  gap: scale(6),
                }}
              >
                <TouchableOpacity
                  className={`rounded-lg flex-1 ${
                    status === "Scheduled" ? "bg-teal-600" : "bg-teal-400"
                  }`}
                  style={{ padding: scale(8) }}
                  onPress={() => setStatus("Scheduled")}
                  activeOpacity={0.8}
                >
                  <Text
                    className="text-white text-center font-pmedium"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Scheduled
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`rounded-lg flex-1 ${
                    status === "Pending" ? "bg-red-600" : "bg-red-400"
                  }`}
                  style={{ padding: scale(8) }}
                  onPress={() => setStatus("Pending")}
                  activeOpacity={0.8}
                >
                  <Text
                    className="text-white text-center font-pmedium"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    Pending
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                className="flex-row justify-between"
                style={{ gap: scale(8) }}
              >
                <TouchableOpacity
                  className="bg-orange-400 rounded-lg flex-1"
                  style={{ padding: scale(10) }}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <Text
                    className="text-white text-center font-pmedium"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    Add Reminder
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-gray-500 rounded-lg flex-1"
                  style={{ padding: scale(10) }}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text
                    className="text-white text-center font-pmedium"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </GestureHandlerRootView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddReminderModal;
