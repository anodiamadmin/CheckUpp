import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from "react-native";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import UnifiedHealthModal from "@/components/screening/UnifiedHealthModal";
import UnifiedFormSection from "@/components/screening/UnifiedFormSection";
import UnifiedFormField from "@/components/screening/UnifiedFormField";
import UnifiedDatePicker from "@/components/screening/UnifiedDatePicker";
import UnifiedPicker from "@/components/screening/UnifiedPicker";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";
import UnifiedValidationSummary from "@/components/screening/UnifiedValidationSummary";
import { useToast } from "@/components/ToastProvider";
import { useFormValidation, ValidationRule } from "@/hooks/useFormValidation";
import {
  EXERCISE_FREQUENCY_OPTIONS,
  SOCIAL_SUPPORT_OPTIONS,
  WORK_STRESS_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
} from "@/constants/formConstants";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import {
  scale,
  getFontSize,
  isSmallDevice,
  screenDimensions,
  getSpacing,
} from "@/lib/utils/responsiveUtils";

export interface MentalHealthReading {
  id: string;
  date: string;
  k10: {
    score?: number;
    level?: "low" | "mild" | "moderate" | "high" | "very-high";
    responses?: number[];
  };
  dass21: {
    depressionScore?: number;
    anxietyScore?: number;
    stressScore?: number;
    depressionLevel?:
      | "normal"
      | "mild"
      | "moderate"
      | "severe"
      | "extremely-severe";
    anxietyLevel?:
      | "normal"
      | "mild"
      | "moderate"
      | "severe"
      | "extremely-severe";
    stressLevel?:
      | "normal"
      | "mild"
      | "moderate"
      | "severe"
      | "extremely-severe";
    responses?: number[];
  };
  sleepQuality: {
    hoursPerNight?: number;
    quality: "very-poor" | "poor" | "fair" | "good" | "excellent";
    difficultyFalling?: boolean;
    frequentWaking?: boolean;
  };
  lifestyle: {
    exerciseFrequency:
      | "never"
      | "rarely"
      | "weekly"
      | "several-times"
      | "daily";
    socialSupport: "none" | "limited" | "adequate" | "strong";
    workStress: "none" | "mild" | "moderate" | "high" | "overwhelming";
    substanceUse: boolean;
  };
  symptoms: {
    persistentSadness: boolean;
    lossOfInterest: boolean;
    anxiousFeelings: boolean;
    irritability: boolean;
    concentrationProblems: boolean;
    fatigueOrLowEnergy: boolean;
  };
  notes?: string;
  wasNormal: boolean;
  createdAt: string;
}

interface MentalHealthData {
  k10Score: string;
  dass21DepressionScore: string;
  dass21AnxietyScore: string;
  dass21StressScore: string;
  sleepHours: string;
  sleepQuality: "very-poor" | "poor" | "fair" | "good" | "excellent";
  difficultyFalling: boolean;
  frequentWaking: boolean;
  exerciseFrequency: "never" | "rarely" | "weekly" | "several-times" | "daily";
  socialSupport: "none" | "limited" | "adequate" | "strong";
  workStress: "none" | "mild" | "moderate" | "high" | "overwhelming";
  substanceUse: boolean;
  persistentSadness: boolean;
  lossOfInterest: boolean;
  anxiousFeelings: boolean;
  irritability: boolean;
  concentrationProblems: boolean;
  fatigueOrLowEnergy: boolean;
  notes: string;
  date: string;
}

interface MentalHealthCheckFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: MentalHealthData, wasNormal: boolean) => void;
  history?: ScreeningHistory;
}

// Initial form data
const initialMentalHealthData: MentalHealthData = {
  k10Score: "",
  dass21DepressionScore: "",
  dass21AnxietyScore: "",
  dass21StressScore: "",
  sleepHours: "",
  sleepQuality: "good",
  difficultyFalling: false,
  frequentWaking: false,
  exerciseFrequency: "weekly",
  socialSupport: "adequate",
  workStress: "mild",
  substanceUse: false,
  persistentSadness: false,
  lossOfInterest: false,
  anxiousFeelings: false,
  irritability: false,
  concentrationProblems: false,
  fatigueOrLowEnergy: false,
  notes: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

// Helper functions
const getK10Level = (score: number): string => {
  if (score <= 15) return "low";
  if (score <= 21) return "mild";
  if (score <= 29) return "moderate";
  if (score <= 39) return "high";
  return "very-high";
};

const getDASS21Level = (
  score: number,
  type: "depression" | "anxiety" | "stress"
): string => {
  const thresholds = {
    depression: [9, 13, 20, 27],
    anxiety: [7, 9, 14, 19],
    stress: [14, 18, 25, 33],
  };

  const levels = ["normal", "mild", "moderate", "severe", "extremely-severe"];
  const thresh = thresholds[type];

  for (let i = 0; i < thresh.length; i++) {
    if (score <= thresh[i]) return levels[i];
  }
  return levels[4];
};

// Validation rules
const mentalHealthValidationRules: ValidationRule<MentalHealthData>[] = [
  {
    field: "k10Score",
    validator: (value) => {
      const k10Score = parseInt(value);
      if (isNaN(k10Score) || k10Score < 10) return null;
      const k10Level = getK10Level(k10Score);
      if (k10Level === "high" || k10Level === "very-high") {
        return `High psychological distress (K-10: ${k10Score})`;
      } else if (k10Level === "moderate") {
        return `Moderate psychological distress (K-10: ${k10Score})`;
      }
      return null;
    },
  },
  {
    field: "dass21DepressionScore",
    validator: (value) => {
      const depressionScore = parseInt(value);
      if (isNaN(depressionScore) || depressionScore < 0) return null;
      const level = getDASS21Level(depressionScore, "depression");
      if (level !== "normal" && level !== "mild") {
        return `DASS-21 Depression: ${level} (${depressionScore})`;
      }
      return null;
    },
  },
  {
    field: "dass21AnxietyScore",
    validator: (value) => {
      const anxietyScore = parseInt(value);
      if (isNaN(anxietyScore) || anxietyScore < 0) return null;
      const level = getDASS21Level(anxietyScore, "anxiety");
      if (level !== "normal" && level !== "mild") {
        return `DASS-21 Anxiety: ${level} (${anxietyScore})`;
      }
      return null;
    },
  },
  {
    field: "dass21StressScore",
    validator: (value) => {
      const stressScore = parseInt(value);
      if (isNaN(stressScore) || stressScore < 0) return null;
      const level = getDASS21Level(stressScore, "stress");
      if (level !== "normal" && level !== "mild") {
        return `DASS-21 Stress: ${level} (${stressScore})`;
      }
      return null;
    },
  },
  {
    field: "sleepHours",
    validator: (value, formData) => {
      const issues = [];
      const sleepHours = parseFloat(value);
      if (!isNaN(sleepHours) && (sleepHours < 6 || sleepHours > 9)) {
        issues.push("Inadequate sleep duration");
      }
      if (
        formData.sleepQuality === "very-poor" ||
        formData.sleepQuality === "poor"
      ) {
        issues.push("Poor sleep quality");
      }
      return issues.length > 0 ? issues.join(", ") : null;
    },
  },
  {
    field: "exerciseFrequency",
    validator: (value, formData) => {
      const issues = [];
      if (value === "never" || value === "rarely") {
        issues.push("Limited physical activity");
      }
      if (
        formData.socialSupport === "none" ||
        formData.socialSupport === "limited"
      ) {
        issues.push("Insufficient social support");
      }
      if (
        formData.workStress === "high" ||
        formData.workStress === "overwhelming"
      ) {
        issues.push("High work-related stress");
      }
      if (formData.substanceUse) {
        issues.push("Substance use reported");
      }
      return issues.length > 0 ? issues.join(", ") : null;
    },
  },
  {
    field: "persistentSadness",
    validator: (value, formData) => {
      const symptoms = [];
      if (value) symptoms.push("persistent sadness");
      if (formData.lossOfInterest) symptoms.push("loss of interest");
      if (formData.anxiousFeelings) symptoms.push("anxious feelings");
      if (formData.irritability) symptoms.push("irritability");
      if (formData.concentrationProblems)
        symptoms.push("concentration problems");
      if (formData.fatigueOrLowEnergy) symptoms.push("fatigue");

      if (symptoms.length >= 3) {
        return `Multiple symptoms present: ${symptoms.join(", ")}`;
      } else if (symptoms.length > 0) {
        return `Symptoms: ${symptoms.join(", ")}`;
      }
      return null;
    },
  },
];

const MentalHealthCheckForm: React.FC<MentalHealthCheckFormProps> = ({
  visible,
  onClose,
  onSubmit,
  history = {},
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const { showToast } = useToast();

  const {
    formData,
    updateFormData,
    resetForm,
    getValidationStatus,
    isFormValid,
  } = useFormValidation(initialMentalHealthData, mentalHealthValidationRules);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleSubmit = () => {
    const requiredFields: (keyof MentalHealthData)[] = ["date"];

    if (!isFormValid(requiredFields)) {
      showToast("Please select a date", "error");
      return;
    }

    const validation = getValidationStatus();
    onSubmit(formData, validation.isNormal);
    showToast("Mental health assessment recorded successfully", "success");
    onClose();
  };

  // Checkbox component
  const CheckboxItem = ({
    label,
    value,
    onValueChange,
  }: {
    label: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View
      className="flex-row items-center justify-between bg-gray-50 rounded-lg"
      style={{
        paddingHorizontal: scale(12),
        paddingVertical: getSpacing(10),
        marginBottom: getSpacing(8),
      }}
    >
      <Text
        className="font-pregular text-gray-700 flex-1"
        style={{ fontSize: getFontSize(13) }}
      >
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? "#FF9C01" : "#f4f4f5"}
        trackColor={{ true: "#FFEED9", false: "#e5e7eb" }}
        ios_backgroundColor="#e5e7eb"
        style={{
          transform: [{ scale: isSmallDevice ? 0.8 : 1 }],
        }}
      />
    </View>
  );

  const requiredFields: (keyof MentalHealthData)[] = ["date"];
  const formValid = isFormValid(requiredFields);
  const validation = getValidationStatus();

  return (
    <>
      <UnifiedHealthModal
        visible={visible}
        onClose={onClose}
        title="Mental Health Assessment"
        subtitle="Track your psychological well-being and stress levels"
        icon="heart-circle-outline"
      >
        {/* Date Selection */}
        <UnifiedDatePicker
          label="Assessment Date"
          value={new Date(formData.date)}
          onChange={(date) =>
            updateFormData("date", format(date, "yyyy-MM-dd"))
          }
          required
          icon="calendar-outline"
        />

        {/* Assessment Scores */}
        <UnifiedFormSection
          title="Standardized Assessment Scores"
          icon="clipboard-outline"
          description="K-10 and DASS-21 psychological assessment scores"
        >
          <View
            className="flex-row items-center justify-between"
            style={{ marginBottom: getSpacing(10) }}
          >
            <View />
            <TouchableOpacity
              onPress={() => setShowInfoModal(true)}
              className="rounded-full items-center justify-center"
              style={{
                width: scale(24),
                height: scale(24),
                backgroundColor: "#FFECD1",
              }}
            >
              <Ionicons name="information" size={scale(14)} color="#FF9C01" />
            </TouchableOpacity>
          </View>

          <UnifiedFormField
            label="K-10 Score"
            value={formData.k10Score}
            onChangeText={(text) => updateFormData("k10Score", text)}
            placeholder="10-50"
            unit="points"
            keyboardType="numeric"
            helperText="Psychological distress scale (10-50)"
            icon="pulse-outline"
          />

          <View className="flex-row" style={{ gap: scale(12) }}>
            <View className="flex-1">
              <UnifiedFormField
                label="DASS-21 Depression"
                value={formData.dass21DepressionScore}
                onChangeText={(text) =>
                  updateFormData("dass21DepressionScore", text)
                }
                placeholder="0-42"
                unit="points"
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <UnifiedFormField
                label="DASS-21 Anxiety"
                value={formData.dass21AnxietyScore}
                onChangeText={(text) =>
                  updateFormData("dass21AnxietyScore", text)
                }
                placeholder="0-42"
                unit="points"
                keyboardType="numeric"
              />
            </View>
          </View>

          <UnifiedFormField
            label="DASS-21 Stress"
            value={formData.dass21StressScore}
            onChangeText={(text) => updateFormData("dass21StressScore", text)}
            placeholder="0-42"
            unit="points"
            keyboardType="numeric"
            helperText="Depression, Anxiety, Stress Scale"
          />

          {/* Show current levels if scores are entered */}
          {formData.k10Score &&
            !isNaN(parseInt(formData.k10Score)) &&
            parseInt(formData.k10Score) >= 10 && (
              <View
                className="rounded-lg border"
                style={{
                  padding: scale(10),
                  marginTop: getSpacing(8),
                  backgroundColor: "#FFF5E6",
                  borderColor: "#FF9C01",
                }}
              >
                <Text
                  className="font-pmedium"
                  style={{ fontSize: getFontSize(12), color: "#FF9C01" }}
                >
                  K-10 Level:{" "}
                  {getK10Level(parseInt(formData.k10Score))
                    .replace("-", " ")
                    .toUpperCase()}
                </Text>
              </View>
            )}
        </UnifiedFormSection>

        {/* Sleep Quality */}
        <UnifiedFormSection
          title="Sleep Quality"
          icon="moon-outline"
          description="Sleep patterns and quality indicators"
        >
          <View className="flex-row" style={{ gap: scale(12) }}>
            <View className="flex-1">
              <UnifiedFormField
                label="Hours per Night"
                value={formData.sleepHours}
                onChangeText={(text) => updateFormData("sleepHours", text)}
                placeholder="7-8"
                unit="hours"
                keyboardType="numeric"
                helperText="Recommended: 7-9 hours"
              />
            </View>
            <View className="flex-1">
              <UnifiedPicker
                label="Sleep Quality"
                value={formData.sleepQuality}
                options={SLEEP_QUALITY_OPTIONS}
                onSelect={(value) => updateFormData("sleepQuality", value)}
                icon="moon-outline"
              />
            </View>
          </View>

          <CheckboxItem
            label="Difficulty falling asleep"
            value={formData.difficultyFalling}
            onValueChange={(value) =>
              updateFormData("difficultyFalling", value)
            }
          />

          <CheckboxItem
            label="Frequent night waking"
            value={formData.frequentWaking}
            onValueChange={(value) => updateFormData("frequentWaking", value)}
          />
        </UnifiedFormSection>

        {/* Lifestyle Factors */}
        <UnifiedFormSection
          title="Lifestyle Factors"
          icon="fitness-outline"
          description="Daily habits and social environment"
        >
          <UnifiedPicker
            label="Exercise Frequency"
            value={formData.exerciseFrequency}
            options={EXERCISE_FREQUENCY_OPTIONS}
            onSelect={(value) => updateFormData("exerciseFrequency", value)}
            icon="fitness-outline"
          />

          <UnifiedPicker
            label="Social Support"
            value={formData.socialSupport}
            options={SOCIAL_SUPPORT_OPTIONS}
            onSelect={(value) => updateFormData("socialSupport", value)}
            icon="people-outline"
          />

          <UnifiedPicker
            label="Work/Life Stress"
            value={formData.workStress}
            options={WORK_STRESS_OPTIONS}
            onSelect={(value) => updateFormData("workStress", value)}
            icon="trending-up-outline"
          />

          <CheckboxItem
            label="Substance use (alcohol, drugs, etc.)"
            value={formData.substanceUse}
            onValueChange={(value) => updateFormData("substanceUse", value)}
          />
        </UnifiedFormSection>

        {/* Symptoms */}
        <UnifiedFormSection
          title="Current Symptoms (Past 2 Weeks)"
          icon="alert-circle-outline"
          description="Mental health symptoms and concerns"
        >
          <CheckboxItem
            label="Persistent sadness or depressed mood"
            value={formData.persistentSadness}
            onValueChange={(value) =>
              updateFormData("persistentSadness", value)
            }
          />

          <CheckboxItem
            label="Loss of interest in activities"
            value={formData.lossOfInterest}
            onValueChange={(value) => updateFormData("lossOfInterest", value)}
          />

          <CheckboxItem
            label="Anxious or worried feelings"
            value={formData.anxiousFeelings}
            onValueChange={(value) => updateFormData("anxiousFeelings", value)}
          />

          <CheckboxItem
            label="Irritability or mood swings"
            value={formData.irritability}
            onValueChange={(value) => updateFormData("irritability", value)}
          />

          <CheckboxItem
            label="Concentration or memory problems"
            value={formData.concentrationProblems}
            onValueChange={(value) =>
              updateFormData("concentrationProblems", value)
            }
          />

          <CheckboxItem
            label="Fatigue or low energy"
            value={formData.fatigueOrLowEnergy}
            onValueChange={(value) =>
              updateFormData("fatigueOrLowEnergy", value)
            }
          />
        </UnifiedFormSection>

        {/* Notes */}
        <UnifiedFormSection
          title="Additional Notes"
          icon="document-text-outline"
          description="Concerns, stressors, or context"
          isLast
        >
          <UnifiedFormField
            label="Notes"
            value={formData.notes}
            onChangeText={(text) => updateFormData("notes", text)}
            placeholder="Any additional mental health concerns, stressors, or context..."
            multiline
          />
        </UnifiedFormSection>

        {/* Validation Summary */}
        {formValid && !validation.isNormal && (
          <UnifiedValidationSummary errors={validation.issues} warnings={[]} />
        )}

        {/* Action Buttons */}
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedActionButton
              title="Cancel"
              onPress={onClose}
              variant="outline"
              fullWidth
            />
          </View>
          <View className="flex-1">
            <UnifiedActionButton
              title="Save Assessment"
              onPress={handleSubmit}
              variant="primary"
              icon="checkmark-outline"
              disabled={!formValid}
              fullWidth
            />
          </View>
        </View>
      </UnifiedHealthModal>

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: scale(20),
          }}
        >
          <View
            className="bg-white rounded-xl"
            style={{
              padding: scale(20),
              width: screenDimensions.width * 0.9,
              maxHeight: screenDimensions.height * 0.7,
            }}
          >
            <View
              className="flex-row justify-between items-center border-b border-gray-100"
              style={{
                marginBottom: getSpacing(12),
                paddingBottom: getSpacing(8),
              }}
            >
              <Text
                className="font-psemibold text-gray-800"
                style={{ fontSize: getFontSize(16) }}
              >
                Assessment Information
              </Text>
              <TouchableOpacity
                onPress={() => setShowInfoModal(false)}
                className="rounded-full bg-gray-100 items-center justify-center"
                style={{
                  width: scale(28),
                  height: scale(28),
                }}
              >
                <Ionicons name="close" size={scale(16)} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                className="font-psemibold text-indigo-800"
                style={{
                  fontSize: getFontSize(14),
                  marginBottom: getSpacing(8),
                }}
              >
                K-10 Psychological Distress Scale
              </Text>
              <Text
                className="font-pregular text-gray-600"
                style={{
                  fontSize: getFontSize(12),
                  marginBottom: getSpacing(12),
                }}
              >
                Scores range from 10-50. Higher scores indicate greater
                psychological distress:
              </Text>
              <View style={{ marginBottom: getSpacing(16) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 4 }}
                >
                  • 10-15: Low distress
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 4 }}
                >
                  • 16-21: Mild distress
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 4 }}
                >
                  • 22-29: Moderate distress
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 4 }}
                >
                  • 30-39: High distress
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 4 }}
                >
                  • 40-50: Very high distress
                </Text>
              </View>

              <Text
                className="font-psemibold text-indigo-800"
                style={{
                  fontSize: getFontSize(14),
                  marginBottom: getSpacing(8),
                }}
              >
                DASS-21 Scale
              </Text>
              <Text
                className="font-pregular text-gray-600"
                style={{
                  fontSize: getFontSize(12),
                  marginBottom: getSpacing(8),
                }}
              >
                Each subscale (Depression, Anxiety, Stress) ranges from 0-42:
              </Text>
              <View style={{ marginBottom: getSpacing(12) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 6 }}
                >
                  Depression: 0-9 Normal, 10-13 Mild, 14-20 Moderate, 21-27
                  Severe, 28+ Extremely Severe
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 6 }}
                >
                  Anxiety: 0-7 Normal, 8-9 Mild, 10-14 Moderate, 15-19 Severe,
                  20+ Extremely Severe
                </Text>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(11), marginBottom: 6 }}
                >
                  Stress: 0-14 Normal, 15-18 Mild, 19-25 Moderate, 26-33 Severe,
                  34+ Extremely Severe
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default MentalHealthCheckForm;
