import React, { useState } from "react";
import {
  Text,
  View,
  Modal,
  Alert,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import HistoryViewer from "./HistoryViewer";
import YearPickerModal from "./YearPickerModal";
import { useToast } from "@/components/ToastProvider";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";

export interface ImmunisationReading {
  id: string;
  date: string;
  vaccine: {
    name: string;
    type: "routine" | "travel" | "occupational" | "catch-up" | "booster";
    brand?: string;
    batchNumber?: string;
  };
  doseNumber: number;
  totalDoses: number;
  site:
    | "left-arm"
    | "right-arm"
    | "left-thigh"
    | "right-thigh"
    | "oral"
    | "nasal";
  provider: {
    name: string;
    clinic: string;
    location: string;
  };
  nextDueDate?: string;
  sideEffects: {
    none: boolean;
    mild: boolean;
    moderate: boolean;
    severe: boolean;
    description?: string;
  };
  travelRelated: {
    isTravel: boolean;
    destination?: string;
    departureDate?: string;
  };
  notes?: string;
  wasCompleted: boolean;
  createdAt: string;
}

const { width, height } = Dimensions.get("window");

// Responsive scaling (same as existing components)
const scale = (size: number) => (width / 350) * size;
const verticalScale = (size: number) => (height / 680) * size;
const moderateScale = (size: number, factor = 0.25) =>
  size + (scale(size) - size) * factor;

const getFontSize = (size: number) => {
  const pixelRatio = PixelRatio.get();
  if (width < 320) return moderateScale(size, 0.15);
  if (width < 350) return moderateScale(size, 0.18);
  if (width >= 768) return moderateScale(size, 0.35);
  if (pixelRatio >= 3) return moderateScale(size, 0.2);
  if (pixelRatio >= 2) return moderateScale(size, 0.22);
  return moderateScale(size, 0.25);
};

const isTablet = width >= 768;
const isSmallDevice = width < 350 || height < 600;
const isVerySmallDevice = width < 320;

const getSpacing = (size: number) => {
  if (isVerySmallDevice) return verticalScale(size * 0.4);
  if (isSmallDevice) return verticalScale(size * 0.5);
  if (isTablet) return verticalScale(size * 1.1);
  return verticalScale(size * 0.7);
};

interface ImmunisationData {
  vaccineName: string;
  vaccineType: "routine" | "travel" | "occupational" | "catch-up" | "booster";
  brand: string;
  batchNumber: string;
  doseNumber: string;
  totalDoses: string;
  site:
    | "left-arm"
    | "right-arm"
    | "left-thigh"
    | "right-thigh"
    | "oral"
    | "nasal";
  providerName: string;
  clinic: string;
  location: string;
  nextDueDate: string;
  sideEffectsNone: boolean;
  sideEffectsMild: boolean;
  sideEffectsModerate: boolean;
  sideEffectsSevere: boolean;
  sideEffectsDescription: string;
  isTravel: boolean;
  travelDestination: string;
  departureDate: string;
  notes: string;
  date: string;
}

interface ImmunisationCheckFormProps {
  onSubmit: (data: ImmunisationData, wasCompleted: boolean) => void;
  history?: ScreeningHistory;
  userAge?: number;
}

// NSW 2025 Immunisation Schedule Data
const NSW_IMMUNISATION_SCHEDULE = {
  infants: [
    { age: "Birth", vaccines: ["Hepatitis B"] },
    { age: "2 months", vaccines: ["DTPa", "Hib", "IPV", "PCV13", "Rotavirus"] },
    { age: "4 months", vaccines: ["DTPa", "Hib", "IPV", "PCV13", "Rotavirus"] },
    { age: "6 months", vaccines: ["DTPa", "Hib", "IPV", "PCV13", "Rotavirus"] },
    {
      age: "12 months",
      vaccines: ["Hib", "PCV13", "MMR", "Meningococcal ACWY"],
    },
    { age: "18 months", vaccines: ["DTPa", "MMR", "Varicella"] },
  ],
  children: [{ age: "4 years", vaccines: ["DTPa", "IPV", "MMR", "Varicella"] }],
  adolescents: [
    { age: "12-13 years", vaccines: ["dTpa", "HPV", "Meningococcal ACWY"] },
  ],
  adults: [
    {
      age: "18+ years",
      vaccines: ["dTpa (every 10 years)", "Influenza (annual)"],
    },
    { age: "50+ years", vaccines: ["Pneumococcal", "Zoster (Shingles)"] },
    {
      age: "65+ years",
      vaccines: ["Pneumococcal 23vPPV", "Enhanced Influenza"],
    },
    {
      age: "70+ years",
      vaccines: ["Zoster (Shingles) - if not previously received"],
    },
  ],
  pregnancy: [{ age: "20-32 weeks", vaccines: ["dTpa", "Influenza"] }],
  travel: [
    {
      destination: "Asia/Africa",
      vaccines: ["Hepatitis A", "Typhoid", "Japanese Encephalitis"],
    },
    {
      destination: "Africa/South America",
      vaccines: ["Yellow Fever", "Meningococcal ACWY"],
    },
    { destination: "Hajj/Umrah", vaccines: ["Meningococcal ACWY (mandatory)"] },
  ],
};

const COMMON_VACCINES = [
  "COVID-19",
  "Influenza",
  "DTPa",
  "dTpa",
  "MMR",
  "Hepatitis A",
  "Hepatitis B",
  "HPV",
  "Pneumococcal",
  "Meningococcal ACWY",
  "Meningococcal B",
  "Varicella",
  "Zoster (Shingles)",
  "Typhoid",
  "Yellow Fever",
  "Japanese Encephalitis",
  "Rabies",
  "Polio (IPV)",
  "Hib",
  "PCV13",
  "Rotavirus",
  "BCG",
  "Other",
];

const ImmunisationCheckForm: React.FC<ImmunisationCheckFormProps> = ({
  onSubmit,
  history = {},
  userAge = 25,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [, setShowNextDuePicker] = useState(false);
  const [, setShowDeparturePicker] = useState(false);
  const { showToast } = useToast();

  const [formData, setFormData] = useState<ImmunisationData>({
    vaccineName: "",
    vaccineType: "routine",
    brand: "",
    batchNumber: "",
    doseNumber: "1",
    totalDoses: "1",
    site: "left-arm",
    providerName: "",
    clinic: "",
    location: "",
    nextDueDate: "",
    sideEffectsNone: true,
    sideEffectsMild: false,
    sideEffectsModerate: false,
    sideEffectsSevere: false,
    sideEffectsDescription: "",
    isTravel: false,
    travelDestination: "",
    departureDate: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const updateFormData = (
    field: keyof ImmunisationData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Get recommended vaccines based on age
  const getRecommendedVaccines = () => {
    const recommendations = [];

    if (userAge >= 18) {
      recommendations.push("dTpa (every 10 years)", "Influenza (annual)");
    }
    if (userAge >= 50) {
      recommendations.push("Pneumococcal", "Zoster (Shingles)");
    }
    if (userAge >= 65) {
      recommendations.push("Pneumococcal 23vPPV", "Enhanced Influenza");
    }

    return recommendations;
  };

  // Validation functions
  const getValidationStatus = () => {
    const issues = [];

    // Check for severe side effects
    if (formData.sideEffectsSevere) {
      issues.push("Severe side effects reported - medical review recommended");
    }

    // Check for overdue boosters (simplified logic)
    const recommendations = getRecommendedVaccines();
    if (recommendations.length > 0) {
      // This would need to be enhanced with actual vaccination history checking
    }

    return {
      isNormal: issues.length === 0,
      issues,
    };
  };

  const isFormValid = () => {
    return formData.vaccineName && formData.providerName && formData.date;
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      showToast("Please fill in vaccine name, provider, and date", "error");
      return;
    }

    getValidationStatus();
    onSubmit(formData, true);

    // Reset form
    setFormData({
      vaccineName: "",
      vaccineType: "routine",
      brand: "",
      batchNumber: "",
      doseNumber: "1",
      totalDoses: "1",
      site: "left-arm",
      providerName: "",
      clinic: "",
      location: "",
      nextDueDate: "",
      sideEffectsNone: true,
      sideEffectsMild: false,
      sideEffectsModerate: false,
      sideEffectsSevere: false,
      sideEffectsDescription: "",
      isTravel: false,
      travelDestination: "",
      departureDate: "",
      notes: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });

    setShowForm(false);
    showToast("Immunisation record added successfully", "success");
  };

  const getImmunisationHistory = () => {
    return history["Immunisation Check"] || [];
  };

  const handleOpenNSWSchedule = () => {
    // In a real app, this would open the NSW Health PDF
    Alert.alert(
      "NSW Immunisation Schedule 2025",
      "This would open the official NSW Health Immunisation Schedule PDF document.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open PDF",
          onPress: () => {
            // Linking.openURL("https://www.health.nsw.gov.au/immunisation/Documents/immunisation-schedule-2025.pdf");
            showToast("PDF would open here in production", "info");
          },
        },
      ],
    );
  };

  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    required?: boolean,
  ) => (
    <View style={{ marginBottom: getSpacing(12) }}>
      <Text
        className="font-pmedium text-gray-700"
        style={{
          fontSize: getFontSize(12),
          marginBottom: getSpacing(4),
        }}
      >
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        className="border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
        style={{
          paddingHorizontal: scale(12),
          paddingVertical: getSpacing(10),
          fontSize: getFontSize(13),
        }}
      />
    </View>
  );

  const renderCheckbox = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      className="flex-row items-center"
      style={{ marginBottom: getSpacing(8) }}
    >
      <View
        className={`rounded border-2 items-center justify-center ${
          value ? "bg-secondary border-secondary" : "bg-white border-gray-300"
        }`}
        style={{
          width: scale(20),
          height: scale(20),
          marginRight: scale(10),
        }}
      >
        {value && <Ionicons name="checkmark" size={scale(14)} color="#000" />}
      </View>
      <Text
        className="font-pregular text-gray-700"
        style={{ fontSize: getFontSize(13) }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPicker = (
    label: string,
    value: string,
    onValueChange: (value: string) => void,
    options: { label: string; value: string }[],
    required?: boolean,
  ) => (
    <View style={{ marginBottom: getSpacing(12) }}>
      <Text
        className="font-pmedium text-gray-700"
        style={{
          fontSize: getFontSize(12),
          marginBottom: getSpacing(4),
        }}
      >
        {label} {required && <Text className="text-red-500">*</Text>}
      </Text>
      <View className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          style={{ height: isSmallDevice ? 40 : 50 }}
          itemStyle={{ fontSize: getFontSize(14) }}
        >
          {options.map((option) => (
            <Picker.Item
              label={option.label}
              value={option.value}
              key={option.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );

  return (
    <>
      <View
        className="bg-white rounded-xl border border-gray-100"
        style={{
          padding: scale(12),
          marginBottom: getSpacing(12),
        }}
      >
        {/* Header */}
        <View
          className="flex-row items-center"
          style={{ marginBottom: getSpacing(12) }}
        >
          <View
            className="rounded-full bg-emerald-100 items-center justify-center"
            style={{
              width: scale(32),
              height: scale(32),
              marginRight: scale(12),
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={scale(18)}
              color="#10b981"
            />
          </View>
          <View className="flex-1">
            <Text
              className="font-psemibold text-gray-800"
              style={{ fontSize: getFontSize(16) }}
            >
              Immunisation Check
            </Text>
            <Text
              className="font-pregular text-gray-600"
              style={{ fontSize: getFontSize(12) }}
            >
              Track vaccinations and follow NSW schedule
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row" style={{ marginBottom: getSpacing(12) }}>
          <TouchableOpacity
            onPress={() => setShowForm(true)}
            className="flex-1 bg-secondary rounded-lg items-center justify-center"
            style={{
              paddingVertical: getSpacing(12),
              marginRight: scale(4),
            }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="add-circle"
                size={scale(16)}
                color="#000"
                style={{ marginRight: scale(6) }}
              />
              <Text
                className="font-pmedium text-gray-900"
                style={{ fontSize: getFontSize(12) }}
              >
                Add Vaccine
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowScheduleModal(true)}
            className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg items-center justify-center"
            style={{
              paddingVertical: getSpacing(12),
              marginHorizontal: scale(4),
            }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="calendar"
                size={scale(16)}
                color="#10b981"
                style={{ marginRight: scale(6) }}
              />
              <Text
                className="font-pmedium text-emerald-600"
                style={{ fontSize: getFontSize(12) }}
              >
                Schedule
              </Text>
            </View>
          </TouchableOpacity>

          {getImmunisationHistory().length > 0 && (
            <TouchableOpacity
              onPress={() => setShowHistoryModal(true)}
              className="flex-1 bg-blue-50 border border-blue-100 rounded-lg items-center justify-center"
              style={{
                paddingVertical: getSpacing(12),
                marginLeft: scale(4),
              }}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="time-outline"
                  size={scale(16)}
                  color="#3b82f6"
                  style={{ marginRight: scale(6) }}
                />
                <Text
                  className="font-pmedium text-blue-600"
                  style={{ fontSize: getFontSize(12) }}
                >
                  History ({getImmunisationHistory().length})
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Recommendations for current age */}
        <View
          className="bg-emerald-50 rounded-lg border border-emerald-100"
          style={{ padding: scale(10) }}
        >
          <Text
            className="font-psemibold text-emerald-700"
            style={{
              fontSize: getFontSize(12),
              marginBottom: getSpacing(6),
            }}
          >
            Recommended for Age {userAge}
          </Text>
          <Text
            className="font-pregular text-emerald-600"
            style={{ fontSize: getFontSize(11) }}
          >
            {getRecommendedVaccines().join(", ") ||
              "No specific recommendations"}
          </Text>
        </View>
      </View>

      {/* History Modal */}
      <HistoryViewer
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        screeningName="Immunisation Check"
        history={getImmunisationHistory()}
        isFullHistory={false}
      />

      {/* NSW Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl shadow-lg"
            style={{
              padding: scale(16),
              width: width * 0.95,
              maxHeight: height * 0.9,
            }}
          >
            <View
              className="flex-row justify-between items-center border-b border-gray-100"
              style={{
                marginBottom: getSpacing(16),
                paddingBottom: getSpacing(12),
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="rounded-full bg-emerald-100 items-center justify-center"
                  style={{
                    width: scale(28),
                    height: scale(28),
                    marginRight: scale(10),
                  }}
                >
                  <Ionicons name="calendar" size={scale(16)} color="#10b981" />
                </View>
                <Text
                  className="font-psemibold text-gray-800"
                  style={{ fontSize: getFontSize(16) }}
                >
                  NSW Immunisation Schedule 2025
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowScheduleModal(false)}
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
              {/* PDF Reference */}
              <TouchableOpacity
                onPress={handleOpenNSWSchedule}
                className="bg-emerald-50 border border-emerald-200 rounded-lg flex-row items-center justify-between"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(16),
                }}
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="document-text"
                    size={scale(20)}
                    color="#10b981"
                  />
                  <View style={{ marginLeft: scale(10) }}>
                    <Text
                      className="font-psemibold text-emerald-800"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      Official NSW Schedule PDF
                    </Text>
                    <Text
                      className="font-pregular text-emerald-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      Complete reference guide
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="open-outline"
                  size={scale(16)}
                  color="#10b981"
                />
              </TouchableOpacity>

              {/* Infants & Children */}
              <View
                className="bg-blue-50 rounded-lg border border-blue-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-blue-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Infants & Children
                </Text>
                {NSW_IMMUNISATION_SCHEDULE.infants.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-blue-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.age}
                    </Text>
                    <Text
                      className="font-pregular text-blue-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
                {NSW_IMMUNISATION_SCHEDULE.children.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-blue-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.age}
                    </Text>
                    <Text
                      className="font-pregular text-blue-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Adolescents */}
              <View
                className="bg-purple-50 rounded-lg border border-purple-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-purple-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Adolescents
                </Text>
                {NSW_IMMUNISATION_SCHEDULE.adolescents.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-purple-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.age}
                    </Text>
                    <Text
                      className="font-pregular text-purple-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Adults */}
              <View
                className="bg-green-50 rounded-lg border border-green-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-green-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Adults
                </Text>
                {NSW_IMMUNISATION_SCHEDULE.adults.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-green-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.age}
                    </Text>
                    <Text
                      className="font-pregular text-green-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Pregnancy */}
              <View
                className="bg-pink-50 rounded-lg border border-pink-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-pink-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Pregnancy
                </Text>
                {NSW_IMMUNISATION_SCHEDULE.pregnancy.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-pink-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.age}
                    </Text>
                    <Text
                      className="font-pregular text-pink-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Travel */}
              <View
                className="bg-orange-50 rounded-lg border border-orange-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-orange-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(8),
                  }}
                >
                  Travel Vaccines
                </Text>
                {NSW_IMMUNISATION_SCHEDULE.travel.map((item, index) => (
                  <View key={index} style={{ marginBottom: getSpacing(6) }}>
                    <Text
                      className="font-pmedium text-orange-700"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      {item.destination}
                    </Text>
                    <Text
                      className="font-pregular text-orange-600"
                      style={{ fontSize: getFontSize(11) }}
                    >
                      {item.vaccines.join(", ")}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Form Modal */}
      <Modal visible={showForm} transparent={true} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl shadow-lg"
            style={{
              padding: scale(16),
              width: width * 0.95,
              maxHeight: height * 0.9,
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
                  className="rounded-full bg-emerald-100 items-center justify-center"
                  style={{
                    width: scale(28),
                    height: scale(28),
                    marginRight: scale(10),
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={scale(16)}
                    color="#10b981"
                  />
                </View>
                <Text
                  className="font-psemibold text-gray-800"
                  style={{ fontSize: getFontSize(16) }}
                >
                  Add Immunisation
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowForm(false)}
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
              {/* Date Selection */}
              <View style={{ marginBottom: getSpacing(16) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{
                    fontSize: getFontSize(12),
                    marginBottom: getSpacing(4),
                  }}
                >
                  Date <Text className="text-red-500">*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
                  style={{
                    paddingHorizontal: scale(12),
                    paddingVertical: getSpacing(10),
                  }}
                >
                  <Text
                    className="font-pregular text-gray-900"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    {formData.date}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={scale(16)}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {/* Vaccine Information Section */}
              <View
                className="bg-emerald-50 rounded-lg border border-emerald-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(16),
                }}
              >
                <Text
                  className="font-psemibold text-emerald-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(10),
                  }}
                >
                  Vaccine Information
                </Text>

                {renderPicker(
                  "Vaccine Name",
                  formData.vaccineName,
                  (value) => updateFormData("vaccineName", value),
                  COMMON_VACCINES.map((vaccine) => ({
                    label: vaccine,
                    value: vaccine,
                  })),
                  true,
                )}

                {renderPicker(
                  "Vaccine Type",
                  formData.vaccineType,
                  (value) => updateFormData("vaccineType", value),
                  [
                    { label: "Routine", value: "routine" },
                    { label: "Travel", value: "travel" },
                    { label: "Occupational", value: "occupational" },
                    { label: "Catch-up", value: "catch-up" },
                    { label: "Booster", value: "booster" },
                  ],
                )}

                <View className="flex-row">
                  <View className="flex-1" style={{ marginRight: scale(8) }}>
                    {renderInputField(
                      "Brand",
                      formData.brand,
                      (text) => updateFormData("brand", text),
                      "e.g., Pfizer, Moderna",
                    )}
                  </View>
                  <View className="flex-1" style={{ marginLeft: scale(8) }}>
                    {renderInputField(
                      "Batch Number",
                      formData.batchNumber,
                      (text) => updateFormData("batchNumber", text),
                      "Optional",
                    )}
                  </View>
                </View>

                <View className="flex-row">
                  <View className="flex-1" style={{ marginRight: scale(8) }}>
                    {renderPicker(
                      "Dose Number",
                      formData.doseNumber,
                      (value) => updateFormData("doseNumber", value),
                      Array.from({ length: 5 }, (_, i) => ({
                        label: `${i + 1}`,
                        value: `${i + 1}`,
                      })),
                    )}
                  </View>
                  <View className="flex-1" style={{ marginLeft: scale(8) }}>
                    {renderPicker(
                      "Total Doses",
                      formData.totalDoses,
                      (value) => updateFormData("totalDoses", value),
                      Array.from({ length: 5 }, (_, i) => ({
                        label: `${i + 1}`,
                        value: `${i + 1}`,
                      })),
                    )}
                  </View>
                </View>

                {renderPicker(
                  "Injection Site",
                  formData.site,
                  (value) => updateFormData("site", value),
                  [
                    { label: "Left Arm", value: "left-arm" },
                    { label: "Right Arm", value: "right-arm" },
                    { label: "Left Thigh", value: "left-thigh" },
                    { label: "Right Thigh", value: "right-thigh" },
                    { label: "Oral", value: "oral" },
                    { label: "Nasal", value: "nasal" },
                  ],
                )}
              </View>

              {/* Provider Information Section */}
              <View
                className="bg-blue-50 rounded-lg border border-blue-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(16),
                }}
              >
                <Text
                  className="font-psemibold text-blue-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(10),
                  }}
                >
                  Provider Information
                </Text>

                {renderInputField(
                  "Provider Name",
                  formData.providerName,
                  (text) => updateFormData("providerName", text),
                  "Dr. Smith",
                  true,
                )}

                {renderInputField(
                  "Clinic/Hospital",
                  formData.clinic,
                  (text) => updateFormData("clinic", text),
                  "Sydney Medical Centre",
                )}

                {renderInputField(
                  "Location",
                  formData.location,
                  (text) => updateFormData("location", text),
                  "Sydney, NSW",
                )}
              </View>

              {/* Travel Section */}
              {formData.vaccineType === "travel" && (
                <View
                  className="bg-orange-50 rounded-lg border border-orange-100"
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(16),
                  }}
                >
                  <Text
                    className="font-psemibold text-orange-800"
                    style={{
                      fontSize: getFontSize(14),
                      marginBottom: getSpacing(10),
                    }}
                  >
                    Travel Information
                  </Text>

                  {renderInputField(
                    "Destination",
                    formData.travelDestination,
                    (text) => updateFormData("travelDestination", text),
                    "Thailand, India, etc.",
                  )}

                  <Text
                    className="font-pmedium text-gray-700"
                    style={{
                      fontSize: getFontSize(12),
                      marginBottom: getSpacing(4),
                    }}
                  >
                    Departure Date
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDeparturePicker(true)}
                    className="border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
                    style={{
                      paddingHorizontal: scale(12),
                      paddingVertical: getSpacing(10),
                    }}
                  >
                    <Text
                      className="font-pregular text-gray-900"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      {formData.departureDate || "Select date"}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={scale(16)}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Side Effects Section */}
              <View
                className="bg-yellow-50 rounded-lg border border-yellow-100"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(16),
                }}
              >
                <Text
                  className="font-psemibold text-yellow-800"
                  style={{
                    fontSize: getFontSize(14),
                    marginBottom: getSpacing(10),
                  }}
                >
                  Side Effects
                </Text>

                {renderCheckbox(
                  "No side effects",
                  formData.sideEffectsNone,
                  (value) => {
                    updateFormData("sideEffectsNone", value);
                    if (value) {
                      updateFormData("sideEffectsMild", false);
                      updateFormData("sideEffectsModerate", false);
                      updateFormData("sideEffectsSevere", false);
                    }
                  },
                )}

                {renderCheckbox(
                  "Mild (soreness, low fever)",
                  formData.sideEffectsMild,
                  (value) => {
                    updateFormData("sideEffectsMild", value);
                    if (value) updateFormData("sideEffectsNone", false);
                  },
                )}

                {renderCheckbox(
                  "Moderate (fever, fatigue)",
                  formData.sideEffectsModerate,
                  (value) => {
                    updateFormData("sideEffectsModerate", value);
                    if (value) updateFormData("sideEffectsNone", false);
                  },
                )}

                {renderCheckbox(
                  "Severe (allergic reaction)",
                  formData.sideEffectsSevere,
                  (value) => {
                    updateFormData("sideEffectsSevere", value);
                    if (value) updateFormData("sideEffectsNone", false);
                  },
                )}

                {!formData.sideEffectsNone && (
                  <View style={{ marginTop: getSpacing(8) }}>
                    <Text
                      className="font-pmedium text-gray-700"
                      style={{
                        fontSize: getFontSize(12),
                        marginBottom: getSpacing(4),
                      }}
                    >
                      Description
                    </Text>
                    <TextInput
                      value={formData.sideEffectsDescription}
                      onChangeText={(text) =>
                        updateFormData("sideEffectsDescription", text)
                      }
                      placeholder="Describe any side effects..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={2}
                      className="border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                      style={{
                        paddingHorizontal: scale(12),
                        paddingVertical: getSpacing(10),
                        fontSize: getFontSize(13),
                        textAlignVertical: "top",
                      }}
                    />
                  </View>
                )}
              </View>

              {/* Next Due Date */}
              <View style={{ marginBottom: getSpacing(16) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{
                    fontSize: getFontSize(12),
                    marginBottom: getSpacing(4),
                  }}
                >
                  Next Dose Due Date
                </Text>
                <TouchableOpacity
                  onPress={() => setShowNextDuePicker(true)}
                  className="border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
                  style={{
                    paddingHorizontal: scale(12),
                    paddingVertical: getSpacing(10),
                  }}
                >
                  <Text
                    className="font-pregular text-gray-900"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    {formData.nextDueDate || "Not applicable"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={scale(16)}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {/* Notes Section */}
              <View style={{ marginBottom: getSpacing(16) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{
                    fontSize: getFontSize(12),
                    marginBottom: getSpacing(4),
                  }}
                >
                  Additional Notes
                </Text>
                <TextInput
                  value={formData.notes}
                  onChangeText={(text) => updateFormData("notes", text)}
                  placeholder="Any additional information..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  className="border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                  style={{
                    paddingHorizontal: scale(12),
                    paddingVertical: getSpacing(10),
                    fontSize: getFontSize(13),
                    textAlignVertical: "top",
                  }}
                />
              </View>

              {/* Validation Summary */}
              {isFormValid() && (
                <View
                  className={`rounded-lg border ${
                    getValidationStatus().isNormal
                      ? "bg-green-50 border-green-100"
                      : "bg-orange-50 border-orange-100"
                  }`}
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(16),
                  }}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        getValidationStatus().isNormal
                          ? "checkmark-circle"
                          : "warning"
                      }
                      size={scale(16)}
                      color={
                        getValidationStatus().isNormal ? "#22c55e" : "#f59e0b"
                      }
                    />
                    <Text
                      className={`font-psemibold ${
                        getValidationStatus().isNormal
                          ? "text-green-800"
                          : "text-orange-800"
                      }`}
                      style={{
                        fontSize: getFontSize(12),
                        marginLeft: scale(6),
                      }}
                    >
                      {getValidationStatus().isNormal
                        ? "Immunisation record complete"
                        : "Please review the following"}
                    </Text>
                  </View>
                  {!getValidationStatus().isNormal && (
                    <Text
                      className="font-pregular text-orange-700"
                      style={{
                        fontSize: getFontSize(11),
                        marginTop: getSpacing(4),
                        marginLeft: scale(22),
                      }}
                    >
                      {getValidationStatus().issues.join(", ")}
                    </Text>
                  )}
                </View>
              )}

              <CustomButton
                title="Save Immunisation"
                handlePress={handleSubmit}
                containerStyles={`rounded-lg ${
                  isFormValid() ? "bg-secondary" : "bg-gray-300"
                }`}
                textStyles={`${
                  isFormValid() ? "text-gray-900" : "text-gray-500"
                } font-pmedium text-center`}
                isLoading={false}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modals */}
      <YearPickerModal
        visible={showDatePicker}
        currentYear={
          formData.date ? parseInt(formData.date.split("-")[0]) : undefined
        }
        onClose={() => setShowDatePicker(false)}
        onConfirm={(year) => {
          const [, month, day] = formData.date.split("-");
          updateFormData("date", `${year}-${month}-${day}`);
          setShowDatePicker(false);
        }}
        title="Date of Vaccination"
        subtitle="Select Year of"
        maxYear={new Date().getFullYear()}
        minYear={new Date().getFullYear() - 10}
      />
    </>
  );
};

export default ImmunisationCheckForm;
