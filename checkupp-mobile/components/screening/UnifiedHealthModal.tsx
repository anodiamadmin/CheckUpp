import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";
import { SafeAreaView } from "react-native-safe-area-context";

interface UnifiedHealthModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

const UnifiedHealthModal: React.FC<UnifiedHealthModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon = "medical-outline",
  children,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#FFFFFF" }}
        edges={["top"]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: scale(20),
                paddingVertical: getSpacing(16),
                backgroundColor: "#FFFFFF",
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                {/* Icon */}
                <View
                  style={{
                    width: scale(40),
                    height: scale(40),
                    borderRadius: scale(12),
                    backgroundColor: "#FFF5E6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: scale(12),
                  }}
                >
                  <Ionicons name={icon} size={scale(20)} color="#FF9C01" />
                </View>

                {/* Title & Subtitle */}
                <View style={{ flex: 1, marginRight: scale(8) }}>
                  <Text
                    style={{
                      fontSize: getFontSize(18),
                      fontFamily: "Poppins-SemiBold",
                      color: "#111827",
                      lineHeight: getFontSize(24),
                    }}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {subtitle && (
                    <Text
                      style={{
                        fontSize: getFontSize(13),
                        fontFamily: "Poppins-Regular",
                        color: "#6B7280",
                        marginTop: getSpacing(2),
                      }}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: scale(36),
                  height: scale(36),
                  borderRadius: scale(18),
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.6}
              >
                <Ionicons name="close" size={scale(22)} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingHorizontal: scale(20),
                paddingTop: getSpacing(20),
                paddingBottom: getSpacing(60),
              }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default UnifiedHealthModal;
