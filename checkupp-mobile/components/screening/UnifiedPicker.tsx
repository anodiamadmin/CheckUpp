import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

interface UnifiedPickerOption {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
}

interface UnifiedPickerProps {
  label: string;
  value: string;
  options: UnifiedPickerOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  searchable?: boolean;
}

const UnifiedPicker: React.FC<UnifiedPickerProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  required = false,
  error,
  icon = "list-outline",
  searchable = false,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const handleSelect = (selectedValue: string) => {
    onSelect(selectedValue);
    setShowModal(false);
    setSearchQuery("");
  };

  return (
    <View style={{ marginBottom: getSpacing(12) }}>
      {/* Label */}
      <View
        className="flex-row items-center"
        style={{ marginBottom: getSpacing(6) }}
      >
        <Ionicons
          name={icon}
          size={scale(12)}
          color="#FF9C01"
          style={{ marginRight: scale(5) }}
        />
        <Text
          className="font-pmedium text-gray-700"
          style={{ fontSize: getFontSize(12) }}
        >
          {label}
          {required && <Text className="text-[#FF9C01]"> *</Text>}
        </Text>
      </View>

      {/* Picker Button */}
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

      {/* Error Message */}
      {error && (
        <View
          className="flex-row items-center"
          style={{ marginTop: getSpacing(4) }}
        >
          <Ionicons
            name="alert-circle"
            size={scale(10)}
            color="#ef4444"
            style={{ marginRight: scale(4) }}
          />
          <Text
            className="font-pregular text-red-600"
            style={{ fontSize: getFontSize(10) }}
          >
            {error}
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
                    {filteredOptions.map((option, index) => {
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
                              index < filteredOptions.length - 1
                                ? getSpacing(8)
                                : 0,
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
                                isSelected ? "text-orange-700" : "text-gray-900"
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
};

export default UnifiedPicker;
