import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface SelectOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface UnifiedFormFieldProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  required?: boolean;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  multiline?: boolean;
  editable?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  unit?: string;
  helperText?: string;
  // Selection field props
  type?: "text" | "select";
  options?: SelectOption[];
  onSelect?: (value: string) => void;
}

const UnifiedFormField: React.FC<UnifiedFormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  required = false,
  error,
  icon,
  multiline = false,
  editable = true,
  rightIcon,
  onRightIconPress,
  unit,
  helperText,
  type = "text",
  options = [],
  onSelect,
}) => {
  const [showModal, setShowModal] = useState(false);

  // For select type, find the selected option
  const selectedOption =
    type === "select" ? options.find((opt) => opt.value === value) : null;
  const displayText = selectedOption
    ? selectedOption.label
    : placeholder || "Select an option";

  const handleSelect = (selectedValue: string) => {
    if (onSelect) {
      onSelect(selectedValue);
    }
    setShowModal(false);
  };

  // Render select field
  if (type === "select") {
    return (
      <View style={{ marginBottom: getSpacing(12) }}>
        {/* Label */}
        <View
          className="flex-row items-center"
          style={{ marginBottom: getSpacing(6) }}
        >
          {icon && (
            <Ionicons
              name={icon}
              size={scale(12)}
              color="#FF9C01"
              style={{ marginRight: scale(5) }}
            />
          )}
          <Text
            className="font-pmedium text-gray-700"
            style={{ fontSize: getFontSize(12) }}
          >
            {label}
            {required && <Text className="text-[#FF9C01]"> *</Text>}
          </Text>
        </View>

        {/* Select Button */}
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
          className={`flex-row items-center justify-between bg-gray-50 rounded-lg border ${
            error ? "border-red-300" : "border-gray-200"
          }`}
          style={{
            paddingHorizontal: scale(12),
            paddingVertical: getSpacing(12),
            minHeight: scale(44),
          }}
        >
          <Text
            className={`font-pregular ${
              value ? "text-gray-900" : "text-gray-400"
            }`}
            style={{ fontSize: getFontSize(13), flex: 1 }}
            numberOfLines={1}
          >
            {displayText}
          </Text>
          <Ionicons name="chevron-down" size={scale(18)} color="#FF9C01" />
        </TouchableOpacity>

        {/* Error or Helper Text */}
        {(error || helperText) && (
          <View
            className="flex-row items-center"
            style={{ marginTop: getSpacing(4) }}
          >
            {error && (
              <Ionicons
                name="alert-circle"
                size={scale(10)}
                color="#ef4444"
                style={{ marginRight: scale(4) }}
              />
            )}
            <Text
              className={`font-pregular ${
                error ? "text-red-600" : "text-gray-500"
              }`}
              style={{ fontSize: getFontSize(10) }}
            >
              {error || helperText}
            </Text>
          </View>
        )}

        {/* Selection Modal */}
        <Modal
          visible={showModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModal(false)}
        >
          <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
              <View className="flex-1 justify-end">
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View className="bg-white rounded-t-3xl shadow-2xl">
                    {/* Header */}
                    <View className="bg-gradient-to-r from-orange-50 to-white rounded-t-3xl">
                      <View
                        className="bg-gray-300 rounded-full mx-auto"
                        style={{
                          width: scale(32),
                          height: scale(3),
                          marginTop: getSpacing(8),
                          marginBottom: getSpacing(6),
                        }}
                      />

                      <View
                        className="flex-row justify-between items-center"
                        style={{
                          paddingHorizontal: scale(20),
                          paddingBottom: getSpacing(12),
                        }}
                      >
                        <View>
                          <Text
                            className="font-pmedium text-orange-600"
                            style={{
                              fontSize: getFontSize(9),
                              marginBottom: scale(2),
                            }}
                          >
                            Select Your
                          </Text>
                          <Text
                            className="font-pmedium text-gray-900"
                            style={{ fontSize: getFontSize(16) }}
                          >
                            {label}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setShowModal(false)}
                          className="items-center justify-center rounded-full bg-gray-100"
                          style={{
                            width: scale(32),
                            height: scale(32),
                          }}
                        >
                          <Ionicons
                            name="close"
                            size={scale(16)}
                            color="#4B5563"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Options List */}
                    <ScrollView
                      style={{
                        maxHeight: scale(400),
                      }}
                      contentContainerStyle={{
                        paddingHorizontal: scale(20),
                        paddingVertical: getSpacing(12),
                      }}
                      showsVerticalScrollIndicator={false}
                      bounces={true}
                    >
                      {options.map((option, index) => {
                        const isSelected = option.value === value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => handleSelect(option.value)}
                            activeOpacity={0.7}
                            className={`rounded-lg border ${
                              isSelected
                                ? "bg-orange-50 border-orange-200"
                                : "bg-white border-gray-200"
                            }`}
                            style={{
                              paddingHorizontal: scale(12),
                              paddingVertical: getSpacing(12),
                              marginBottom:
                                index < options.length - 1 ? getSpacing(8) : 0,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            {/* Icon */}
                            {option.icon && (
                              <View
                                className="rounded-lg items-center justify-center"
                                style={{
                                  width: scale(36),
                                  height: scale(36),
                                  backgroundColor: isSelected
                                    ? "#FF9C0115"
                                    : "#F5F5F5",
                                  marginRight: scale(12),
                                }}
                              >
                                <Ionicons
                                  name={option.icon}
                                  size={scale(18)}
                                  color={isSelected ? "#FF9C01" : "#64748b"}
                                />
                              </View>
                            )}

                            {/* Text Content */}
                            <View className="flex-1">
                              <Text
                                className={`font-pmedium ${
                                  isSelected
                                    ? "text-orange-700"
                                    : "text-gray-900"
                                }`}
                                style={{ fontSize: getFontSize(13) }}
                              >
                                {option.label}
                              </Text>
                              {option.description && (
                                <Text
                                  className="font-pregular text-gray-500"
                                  style={{
                                    fontSize: getFontSize(11),
                                    marginTop: getSpacing(2),
                                  }}
                                >
                                  {option.description}
                                </Text>
                              )}
                            </View>

                            {/* Check Icon */}
                            {isSelected && (
                              <View
                                className="rounded-full items-center justify-center"
                                style={{
                                  width: scale(24),
                                  height: scale(24),
                                  backgroundColor: "#FF9C01",
                                  marginLeft: scale(8),
                                }}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={scale(14)}
                                  color="#FFFFFF"
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Bottom Padding for safe area */}
                    <View style={{ height: getSpacing(20) }} />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </BlurView>
        </Modal>
      </View>
    );
  }

  // Render text input field (default)
  return (
    <View style={{ marginBottom: getSpacing(12) }}>
      {/* Label */}
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(6) }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={scale(12)}
            color="#FF9C01"
            style={{ marginRight: scale(5) }}
          />
        )}
        <Text
          className="font-pmedium text-gray-700"
          style={{ fontSize: getFontSize(12) }}
        >
          {label}
          {required && <Text className="text-[#FF9C01]"> *</Text>}
        </Text>
      </View>

      {/* Input Container */}
      <View
        className={`flex-row items-center bg-gray-50 rounded-lg border ${
          error ? "border-red-300" : "border-gray-200"
        }`}
        style={{
          paddingHorizontal: scale(12),
          paddingVertical: multiline ? getSpacing(8) : 0,
          minHeight: multiline ? scale(80) : scale(44),
        }}
      >
        <TextInput
          className="flex-1 font-pregular text-gray-900"
          style={{
            fontSize: getFontSize(13),
            paddingVertical: multiline ? getSpacing(8) : getSpacing(10),
            lineHeight: getFontSize(18),
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          textAlignVertical={multiline ? "top" : "center"}
          returnKeyType={multiline ? "default" : "done"}
          blurOnSubmit={!multiline}
          autoCorrect={false}
          autoCapitalize="sentences"
        />

        {/* Unit Text */}
        {unit && (
          <Text
            className="font-pregular text-gray-500"
            style={{
              fontSize: getFontSize(12),
              marginLeft: scale(4),
            }}
          >
            {unit}
          </Text>
        )}

        {/* Right Icon */}
        {rightIcon && onRightIconPress && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ marginLeft: scale(6) }}
            activeOpacity={0.7}
          >
            <Ionicons name={rightIcon} size={scale(16)} color="#FF9C01" />
          </TouchableOpacity>
        )}
      </View>

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <View
          className="flex-row items-center"
          style={{ marginTop: getSpacing(4) }}
        >
          {error && (
            <Ionicons
              name="alert-circle"
              size={scale(10)}
              color="#ef4444"
              style={{ marginRight: scale(4) }}
            />
          )}
          <Text
            className={`font-pregular ${
              error ? "text-red-600" : "text-gray-500"
            }`}
            style={{ fontSize: getFontSize(10), flex: 1 }}
          >
            {error || helperText}
          </Text>
        </View>
      )}
    </View>
  );
};

export default UnifiedFormField;
