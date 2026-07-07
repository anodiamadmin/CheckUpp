import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Dimensions,
  PixelRatio,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import countryCodes from "@/constants/countryCodes";

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

interface PhoneInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  defaultCountryCode?: string;
}

type CountryOption = (typeof countryCodes)[number];

const validatePhoneNumber = (
  number: string,
  country?: CountryOption | null,
) => {
  if (!country) return { isValid: false, message: "" };
  if (number.length === 0) return { isValid: true, message: "" };

  if (number.length < country.minLength) {
    return {
      isValid: false,
      message: `${country.country} requires ${country.minLength}${
        country.minLength !== country.maxLength ? `-${country.maxLength}` : ""
      } digits`,
    };
  }

  if (number.length > country.maxLength) {
    return {
      isValid: false,
      message: `${country.country} accepts maximum ${country.maxLength} digits`,
    };
  }

  return { isValid: true, message: `Valid ${country.country} number` };
};

const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = "Enter phone number",
  required = false,
  defaultCountryCode = "+61",
}) => {
  const orderedCountries = useMemo(
    () => [...countryCodes].sort((a, b) => b.code.length - a.code.length),
    [],
  );

  const resolveCountryByDialCode = useCallback(
    (dial: string) =>
      orderedCountries.find(
        (country) => country.code.toLowerCase() === dial.toLowerCase(),
      ) ??
      orderedCountries.find((country) => country.code === defaultCountryCode) ??
      orderedCountries[0],
    [defaultCountryCode, orderedCountries],
  );

  const parseExistingValue = useCallback(
    (composedValue?: string): { country: CountryOption; local: string } => {
      const normalized = (composedValue || "").trim();
      if (!normalized) {
        const fallback = resolveCountryByDialCode(defaultCountryCode);
        return { country: fallback, local: "" };
      }

      const match = orderedCountries.find((country) =>
        normalized.startsWith(country.code),
      );

      if (match) {
        return {
          country: match,
          local: normalized.slice(match.code.length).replace(/[^0-9]/g, ""),
        };
      }

      const fallback = resolveCountryByDialCode(defaultCountryCode);
      return {
        country: fallback,
        local: normalized.replace(/^\+/, "").replace(/[^0-9]/g, ""),
      };
    },
    [defaultCountryCode, orderedCountries, resolveCountryByDialCode],
  );

  const initialState = useMemo(
    () => parseExistingValue(value),
    [parseExistingValue, value],
  );

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
    initialState.country,
  );
  const [phoneNumber, setPhoneNumber] = useState(initialState.local);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const phoneInputRef = useRef<TextInput>(null);
  const searchInputRef = useRef<TextInput>(null);
  const lastCommittedValueRef = useRef(value || "");
  const closingCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);

  const composeValue = useCallback(
    (country: CountryOption, digits: string) =>
      digits.length ? `${country.code}${digits}` : country.code,
    [],
  );

  const notifyChange = useCallback(
    (country: CountryOption, digits: string) => {
      const nextValue = composeValue(country, digits);
      lastCommittedValueRef.current = nextValue;
      onChangeText(nextValue);
    },
    [composeValue, onChangeText],
  );

  useEffect(() => {
    if (value === lastCommittedValueRef.current) {
      return;
    }
    const parsed = parseExistingValue(value);
    setSelectedCountry(parsed.country);
    setPhoneNumber(parsed.local);
    lastCommittedValueRef.current = value || "";
  }, [parseExistingValue, value]);

  useEffect(() => {
    if (value) return;
    const fallback = resolveCountryByDialCode(defaultCountryCode);
    setSelectedCountry(fallback);
  }, [defaultCountryCode, resolveCountryByDialCode, value]);

  useEffect(() => {
    if (!isPickerVisible) {
      setSearchQuery("");
      return;
    }

    const timeout = setTimeout(() => {
      if (Platform.OS === "android") {
        searchInputRef.current?.focus();
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [isPickerVisible]);

  useEffect(
    () => () => {
      if (closingCooldownRef.current) {
        clearTimeout(closingCooldownRef.current);
      }
    },
    [],
  );

  const handleInputFocus = useCallback(() => setIsFocused(true), []);
  const handleInputBlur = useCallback(() => setIsFocused(false), []);

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orderedCountries;

    return orderedCountries.filter(
      (country) =>
        country.country.toLowerCase().includes(query) ||
        country.code.includes(query) ||
        country.short.toLowerCase().includes(query),
    );
  }, [orderedCountries, searchQuery]);

  const handlePhoneChange = useCallback(
    (text: string) => {
      const numericText = text.replace(/[^0-9]/g, "");
      setPhoneNumber(numericText);
      notifyChange(selectedCountry, numericText);
    },
    [notifyChange, selectedCountry],
  );

  const openPicker = useCallback(() => {
    if (isPickerVisible || isClosingRef.current) return;
    Keyboard.dismiss();
    setIsPickerVisible(true);
  }, [isPickerVisible]);

  const closePicker = useCallback(() => {
    if (!isPickerVisible) return;
    Keyboard.dismiss();
    setIsPickerVisible(false);
    isClosingRef.current = true;
    if (closingCooldownRef.current) {
      clearTimeout(closingCooldownRef.current);
    }
    closingCooldownRef.current = setTimeout(() => {
      isClosingRef.current = false;
    }, 250);
  }, [isPickerVisible]);

  const handleCountrySelect = useCallback(
    (country: CountryOption) => {
      setSelectedCountry(country);
      notifyChange(country, phoneNumber);
      closePicker();
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 250);
    },
    [closePicker, notifyChange, phoneNumber],
  );

  const validation = useMemo(
    () => validatePhoneNumber(phoneNumber, selectedCountry),
    [phoneNumber, selectedCountry],
  );

  const borderColor = useMemo(() => {
    if (isPickerVisible) return "border-orange-300";
    if (!validation.isValid && phoneNumber.length > 0) return "border-red-300";
    if (validation.isValid && phoneNumber.length > 0 && isFocused) {
      return "border-green-300";
    }
    return "border-gray-200";
  }, [isFocused, isPickerVisible, phoneNumber.length, validation]);

  const shouldShowValidationIcon = phoneNumber.length > 0 && isFocused;

  const renderCountryItem = ({ item }: { item: CountryOption }) => {
    const isSelected = selectedCountry?.code === item.code;
    return (
      <TouchableOpacity
        onPress={() => handleCountrySelect(item)}
        activeOpacity={0.8}
        className={`flex-row items-center rounded-lg ${
          isSelected ? "bg-orange-50 border border-orange-200" : "bg-white"
        }`}
        style={{
          paddingHorizontal: scale(10),
          paddingVertical: getSpacing(6),
          marginBottom: getSpacing(2),
        }}
      >
        <Text
          style={{
            fontSize: getFontSize(16),
            marginRight: scale(8),
          }}
        >
          {item.flag}
        </Text>
        <View className="flex-1">
          <Text
            className="font-pmedium text-gray-900"
            style={{ fontSize: getFontSize(11) }}
            numberOfLines={1}
          >
            {item.country}
          </Text>
          <Text
            className="text-gray-500 font-pregular"
            style={{ fontSize: getFontSize(8) }}
          >
            {item.minLength === item.maxLength
              ? `${item.minLength} digits`
              : `${item.minLength}-${item.maxLength} digits`}
          </Text>
        </View>
        <Text
          className="font-pregular text-gray-500"
          style={{
            fontSize: getFontSize(10),
            marginRight: scale(6),
          }}
        >
          {item.code}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={scale(14)} color="#FF9C01" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="relative" style={{ marginBottom: getSpacing(8) }}>
      <Text
        className="font-pmedium text-gray-900"
        style={{
          fontSize: getFontSize(13),
          marginBottom: getSpacing(6),
        }}
      >
        {label} {required && <Text className="text-orange-500">*</Text>}
      </Text>

      <View className="relative">
        <View
          className={`flex-row items-center bg-white rounded-lg border  ${borderColor}`}
          style={{ padding: scale(2) }}
        >
          <TouchableOpacity
            onPress={openPicker}
            activeOpacity={0.7}
            className="flex-row items-center bg-gray-50 rounded-lg"
            style={{
              paddingHorizontal: scale(8),
              paddingVertical: getSpacing(6),
              marginRight: scale(4),
              zIndex: 60,
              minWidth: scale(80),
            }}
          >
            <Text style={{ fontSize: getFontSize(14), marginRight: scale(4) }}>
              {selectedCountry?.flag}
            </Text>
            <Text
              className="font-psemibold text-gray-800"
              style={{
                fontSize: getFontSize(10),
                marginRight: scale(2),
              }}
            >
              {selectedCountry?.short}
            </Text>
            <Text
              className="font-pmedium text-gray-600"
              style={{
                fontSize: getFontSize(10),
                marginRight: scale(4),
              }}
            >
              {selectedCountry?.code}
            </Text>
            <Ionicons
              name={isPickerVisible ? "chevron-up" : "chevron-down"}
              size={scale(12)}
              color="#FF9C01"
            />
          </TouchableOpacity>

          <TextInput
            ref={phoneInputRef}
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            keyboardType="phone-pad"
            returnKeyType="done"
            className="flex-1 font-pmedium text-gray-900"
            style={{
              fontSize: getFontSize(12),
              paddingHorizontal: scale(6),
              paddingVertical: getSpacing(6),
              zIndex: 60,
            }}
            placeholderTextColor="#9CA3AF"
            maxLength={selectedCountry?.maxLength || 15}
          />

          {shouldShowValidationIcon && (
            <View style={{ marginRight: scale(6) }}>
              <Ionicons
                name={
                  validation.isValid ? "checkmark-circle" : "warning-outline"
                }
                size={scale(16)}
                color={validation.isValid ? "#10B981" : "#EF4444"}
              />
            </View>
          )}
        </View>

        <Modal
          visible={isPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={closePicker}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.25)",
                justifyContent: "flex-end",
              }}
              activeOpacity={1}
              onPress={closePicker}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                <View
                  style={{
                    backgroundColor: "#fff",
                    paddingHorizontal: scale(12),
                    paddingTop: getSpacing(12),
                    paddingBottom:
                      Platform.OS === "ios" ? getSpacing(12) : getSpacing(6),
                    borderTopLeftRadius: scale(18),
                    borderTopRightRadius: scale(18),
                    shadowColor: "#000",
                    shadowOpacity: 0.15,
                    shadowRadius: 10,
                    elevation: 8,
                  }}
                >
                  <View
                    className="flex-row items-center justify-between mb-3"
                    style={{
                      marginBottom: getSpacing(8),
                    }}
                  >
                    <Text
                      className="font-psemibold text-gray-900"
                      style={{ fontSize: getFontSize(14) }}
                    >
                      Select Country Code
                    </Text>
                    <TouchableOpacity onPress={closePicker}>
                      <Ionicons name="close" size={scale(16)} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  <View
                    className="flex-row items-center bg-gray-50 rounded-lg border border-gray-200"
                    style={{
                      paddingHorizontal: scale(8),
                      paddingVertical: getSpacing(6),
                      marginBottom: getSpacing(6),
                    }}
                  >
                    <Ionicons
                      name="search-outline"
                      size={scale(14)}
                      color="#9CA3AF"
                    />
                    <TextInput
                      ref={searchInputRef}
                      value={searchQuery}
                      onChangeText={handleSearchQueryChange}
                      placeholder="Search countries or codes"
                      returnKeyType="search"
                      autoCorrect={false}
                      autoCapitalize="none"
                      className="flex-1 font-pregular text-gray-900"
                      style={{
                        fontSize: getFontSize(11),
                        marginLeft: scale(6),
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons
                          name="close-circle"
                          size={scale(14)}
                          color="#9CA3AF"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {filteredCountries.length > 0 ? (
                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(item) => `${item.code}-${item.short}`}
                      renderItem={renderCountryItem}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                      style={{
                        maxHeight: isSmallDevice ? 260 : 320,
                      }}
                    />
                  ) : (
                    <View
                      className="items-center justify-center"
                      style={{
                        padding: scale(20),
                        minHeight: scale(120),
                      }}
                    >
                      <Ionicons
                        name="search-outline"
                        size={scale(24)}
                        color="#D1D5DB"
                      />
                      <Text
                        className="text-gray-500 font-pregular text-center"
                        style={{
                          fontSize: getFontSize(11),
                          marginTop: getSpacing(6),
                        }}
                      >
                        No countries found
                      </Text>
                      <Text
                        className="text-gray-400 font-pregular text-center"
                        style={{
                          fontSize: getFontSize(9),
                          marginTop: getSpacing(2),
                        }}
                      >
                        Try searching by country name or code
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      </View>

      {!validation.isValid && phoneNumber.length > 0 && (
        <View
          className="flex-row items-center bg-red-50 rounded-lg border border-red-200"
          style={{
            padding: scale(6),
            marginTop: getSpacing(6),
          }}
        >
          <Ionicons name="warning-outline" size={scale(12)} color="#EF4444" />
          <Text
            className="text-red-600 font-pmedium"
            style={{
              fontSize: getFontSize(10),
              marginLeft: scale(4),
            }}
          >
            {validation.message}
          </Text>
        </View>
      )}
    </View>
  );
};

export default PhoneInput;
