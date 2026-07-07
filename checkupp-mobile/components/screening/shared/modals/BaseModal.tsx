import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  scale,
  getFontSize,
  getSpacing,
  screenDimensions,
} from "@/lib/utils/responsiveUtils";

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  iconColor: string;
  iconBackgroundColor: string;
  children: React.ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({
  visible,
  onClose,
  title,
  icon,
  iconColor,
  iconBackgroundColor,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View
          className="bg-white rounded-xl shadow-lg"
          style={{
            padding: scale(16),
            width: screenDimensions.width * 0.95,
            maxHeight: screenDimensions.height * 0.9,
          }}
        >
          {/* Modal Header */}
          <View
            className="flex-row justify-between items-center border-b border-gray-100"
            style={{
              marginBottom: getSpacing(16),
              paddingBottom: getSpacing(12),
            }}
          >
            <View className="flex-row items-center">
              <View
                className={`rounded-full ${iconBackgroundColor} items-center justify-center`}
                style={{
                  width: scale(28),
                  height: scale(28),
                  marginRight: scale(10),
                }}
              >
                <Ionicons
                  name={icon as any}
                  size={scale(16)}
                  color={iconColor}
                />
              </View>
              <Text
                className="font-psemibold text-gray-800"
                style={{ fontSize: getFontSize(16) }}
              >
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full bg-gray-100 items-center justify-center"
              style={{
                width: scale(32),
                height: scale(32),
              }}
            >
              <Ionicons name="close" size={scale(18)} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default BaseModal;
