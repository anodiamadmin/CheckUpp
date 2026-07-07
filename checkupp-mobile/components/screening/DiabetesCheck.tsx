import React, { useEffect } from "react";
import { View } from "react-native";
import { format } from "date-fns";
import UnifiedHealthModal from "@/components/screening/UnifiedHealthModal";
import UnifiedFormSection from "@/components/screening/UnifiedFormSection";
import UnifiedFormField from "@/components/screening/UnifiedFormField";
import UnifiedDatePicker from "@/components/screening/UnifiedDatePicker";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";
import UnifiedValidationSummary from "@/components/screening/UnifiedValidationSummary";
import { useToast } from "@/components/ToastProvider";
import { useFormValidation, ValidationRule } from "@/hooks/useFormValidation";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import { scale } from "@/lib/utils/responsiveUtils";

export interface DiabetesReading {
  id: string;
  date: string;
  bloodGlucose: {
    fasting?: number;
    random?: number;
    postMeal?: number;
  };
  hba1c?: number;
  ketones?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  bmi?: number;
  notes?: string;
  wasNormal: boolean;
  createdAt: string;
}

interface DiabetesData {
  fastingGlucose: string;
  randomGlucose: string;
  postMealGlucose: string;
  hba1c: string;
  ketones: string;
  systolicBP: string;
  diastolicBP: string;
  weight: string;
  height: string;
  notes: string;
  date: string;
}

interface DiabetesCheckFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DiabetesData, wasNormal: boolean) => void;
  history?: ScreeningHistory;
}

// Initial form data
const initialDiabetesData: DiabetesData = {
  fastingGlucose: "",
  randomGlucose: "",
  postMealGlucose: "",
  hba1c: "",
  ketones: "",
  systolicBP: "",
  diastolicBP: "",
  weight: "",
  height: "",
  notes: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

// Validation rules
const diabetesValidationRules: ValidationRule<DiabetesData>[] = [
  {
    field: "fastingGlucose",
    validator: (value) => {
      const fasting = parseFloat(value);
      if (isNaN(fasting)) return null;
      if (fasting >= 7.0) return "High fasting glucose (diabetes range)";
      if (fasting >= 6.1) return "Elevated fasting glucose (pre-diabetes)";
      return null;
    },
  },
  {
    field: "randomGlucose",
    validator: (value) => {
      const random = parseFloat(value);
      if (isNaN(random)) return null;
      if (random >= 11.1) return "High random glucose (diabetes range)";
      if (random >= 7.8) return "Elevated random glucose";
      return null;
    },
  },
  {
    field: "postMealGlucose",
    validator: (value) => {
      const postMeal = parseFloat(value);
      if (isNaN(postMeal)) return null;
      if (postMeal >= 11.1) return "High post-meal glucose";
      if (postMeal >= 7.8) return "Elevated post-meal glucose";
      return null;
    },
  },
  {
    field: "hba1c",
    validator: (value) => {
      const hba1c = parseFloat(value);
      if (isNaN(hba1c)) return null;
      if (hba1c >= 6.5) return "High HbA1c (diabetes range)";
      if (hba1c >= 6.0) return "Elevated HbA1c (pre-diabetes)";
      return null;
    },
  },
  {
    field: "ketones",
    validator: (value) => {
      const ketones = parseFloat(value);
      if (isNaN(ketones)) return null;
      if (ketones >= 1.5) return "High ketones (seek immediate care)";
      if (ketones >= 0.6) return "Elevated ketones";
      return null;
    },
  },
  {
    field: "systolicBP",
    validator: (value, formData) => {
      const systolic = parseFloat(value);
      const diastolic = parseFloat(formData.diastolicBP);
      if (isNaN(systolic) || isNaN(diastolic)) return null;
      if (systolic >= 140 || diastolic >= 90) return "High blood pressure";
      if (systolic >= 130 || diastolic >= 80) return "Elevated blood pressure";
      return null;
    },
  },
  {
    field: "weight",
    validator: (value, formData) => {
      const weight = parseFloat(value);
      const height = parseFloat(formData.height);
      if (isNaN(weight) || isNaN(height) || height <= 0) return null;

      const heightInM = height / 100;
      const bmi = weight / (heightInM * heightInM);
      if (bmi >= 30) return "BMI indicates obesity";
      if (bmi >= 25) return "BMI indicates overweight";
      return null;
    },
  },
];

const DiabetesCheckForm: React.FC<DiabetesCheckFormProps> = ({
  visible,
  onClose,
  onSubmit,
  history = {},
}) => {
  const { showToast } = useToast();

  const {
    formData,
    updateFormData,
    resetForm,
    getValidationStatus,
    isFormValid,
  } = useFormValidation(initialDiabetesData, diabetesValidationRules);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleSubmit = () => {
    const requiredFields: (keyof DiabetesData)[] = ["date"];

    // Check if at least one glucose measurement is provided
    const hasGlucoseMeasurement =
      formData.fastingGlucose ||
      formData.randomGlucose ||
      formData.postMealGlucose ||
      formData.hba1c;

    if (!isFormValid(requiredFields) || !hasGlucoseMeasurement) {
      showToast(
        "Please fill in at least one glucose measurement and date",
        "error"
      );
      return;
    }

    const validation = getValidationStatus();
    onSubmit(formData, validation.isNormal);
    showToast("Diabetes screening data recorded successfully", "success");
    onClose();
  };

  const requiredFields: (keyof DiabetesData)[] = ["date"];
  const hasGlucoseMeasurement =
    formData.fastingGlucose ||
    formData.randomGlucose ||
    formData.postMealGlucose ||
    formData.hba1c;
  const formValid = isFormValid(requiredFields) && hasGlucoseMeasurement;
  const validation = getValidationStatus();

  return (
    <UnifiedHealthModal
      visible={visible}
      onClose={onClose}
      title="Diabetes Test"
      subtitle="Track your blood glucose and diabetes indicators"
      icon="analytics-outline"
    >
      {/* Date Selection */}
      <UnifiedDatePicker
        label="Test Date"
        value={new Date(formData.date)}
        onChange={(date) => updateFormData("date", format(date, "yyyy-MM-dd"))}
        required
        icon="calendar-outline"
      />

      {/* Blood Glucose Section */}
      <UnifiedFormSection
        title="Blood Glucose Levels"
        icon="water-outline"
        description="Current glucose measurements"
      >
        <UnifiedFormField
          label="Fasting Glucose"
          value={formData.fastingGlucose}
          onChangeText={(text) => updateFormData("fastingGlucose", text)}
          placeholder="5.6"
          unit="mmol/L"
          keyboardType="numeric"
          helperText="Normal: 3.9-5.5 mmol/L"
          icon="time-outline"
        />

        <UnifiedFormField
          label="Random Glucose"
          value={formData.randomGlucose}
          onChangeText={(text) => updateFormData("randomGlucose", text)}
          placeholder="7.8"
          unit="mmol/L"
          keyboardType="numeric"
          helperText="Normal: less than 7.8 mmol/L"
        />

        <UnifiedFormField
          label="Post-Meal Glucose"
          value={formData.postMealGlucose}
          onChangeText={(text) => updateFormData("postMealGlucose", text)}
          placeholder="7.8"
          unit="mmol/L"
          keyboardType="numeric"
          helperText="Normal: less than 7.8 mmol/L (2h after eating)"
        />
      </UnifiedFormSection>

      {/* HbA1c and Ketones */}
      <UnifiedFormSection
        title="Long-term Indicators"
        icon="trending-up-outline"
        description="HbA1c shows average glucose over 2-3 months"
      >
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="HbA1c"
              value={formData.hba1c}
              onChangeText={(text) => updateFormData("hba1c", text)}
              placeholder="5.7"
              unit="%"
              keyboardType="numeric"
              helperText="Normal: less than 5.7%"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Ketones"
              value={formData.ketones}
              onChangeText={(text) => updateFormData("ketones", text)}
              placeholder="0.0"
              unit="mmol/L"
              keyboardType="numeric"
              helperText="Normal: less than 0.6"
            />
          </View>
        </View>
      </UnifiedFormSection>

      {/* Additional Measurements */}
      <UnifiedFormSection
        title="Additional Measurements"
        icon="fitness-outline"
        description="Blood pressure and body metrics"
      >
        {/* Blood Pressure */}
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Systolic BP"
              value={formData.systolicBP}
              onChangeText={(text) => updateFormData("systolicBP", text)}
              placeholder="120"
              unit="mmHg"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Diastolic BP"
              value={formData.diastolicBP}
              onChangeText={(text) => updateFormData("diastolicBP", text)}
              placeholder="80"
              unit="mmHg"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Weight and Height for BMI */}
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Weight"
              value={formData.weight}
              onChangeText={(text) => updateFormData("weight", text)}
              placeholder="70"
              unit="kg"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Height"
              value={formData.height}
              onChangeText={(text) => updateFormData("height", text)}
              placeholder="170"
              unit="cm"
              keyboardType="numeric"
            />
          </View>
        </View>
      </UnifiedFormSection>

      {/* Notes Section */}
      <UnifiedFormSection
        title="Additional Notes"
        icon="document-text-outline"
        description="Symptoms, medications, or observations"
        isLast
      >
        <UnifiedFormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => updateFormData("notes", text)}
          placeholder="Any symptoms, medications, or additional observations..."
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
            title="Save Test"
            onPress={handleSubmit}
            variant="primary"
            icon="checkmark-outline"
            disabled={!formValid}
            fullWidth
          />
        </View>
      </View>
    </UnifiedHealthModal>
  );
};

export default DiabetesCheckForm;
