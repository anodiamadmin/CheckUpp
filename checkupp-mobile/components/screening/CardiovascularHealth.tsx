import React, { useEffect } from "react";
import { View } from "react-native";
import { format } from "date-fns";
import UnifiedHealthModal from "@/components/screening/UnifiedHealthModal";
import UnifiedFormSection from "@/components/screening/UnifiedFormSection";
import UnifiedFormField from "@/components/screening/UnifiedFormField";
import UnifiedDatePicker from "@/components/screening/UnifiedDatePicker";
import UnifiedToggle from "@/components/screening/UnifiedToggle";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";
import UnifiedValidationSummary from "@/components/screening/UnifiedValidationSummary";
import { useToast } from "@/components/ToastProvider";
import { useFormValidation, ValidationRule } from "@/hooks/useFormValidation";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import { getSpacing, scale } from "@/lib/utils/responsiveUtils";

export interface CardiovascularReading {
  id: string;
  date: string;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  ecg?: {
    result: "normal" | "abnormal";
    notes?: string;
  };
  cholesterol?: {
    total?: number;
    ldl?: number;
    hdl?: number;
    triglycerides?: number;
  };
  wasNormal: boolean;
  createdAt: string;
}

interface CardiovascularData {
  systolicBP: string;
  diastolicBP: string;
  heartRate: string;
  ecgResult: "normal" | "abnormal" | "";
  ecgNotes: string;
  totalCholesterol: string;
  ldlCholesterol: string;
  hdlCholesterol: string;
  triglycerides: string;
  date: string;
}

interface CardiovascularHealthFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CardiovascularData, wasNormal: boolean) => void;
  history?: ScreeningHistory;
}

// Initial form data
const initialCardiovascularData: CardiovascularData = {
  systolicBP: "",
  diastolicBP: "",
  heartRate: "",
  ecgResult: "",
  ecgNotes: "",
  totalCholesterol: "",
  ldlCholesterol: "",
  hdlCholesterol: "",
  triglycerides: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

// Validation rules
const cardiovascularValidationRules: ValidationRule<CardiovascularData>[] = [
  {
    field: "systolicBP",
    validator: (value, formData) => {
      const systolic = parseInt(value);
      if (isNaN(systolic)) return null;
      if (systolic >= 140) return "High systolic blood pressure";
      if (systolic >= 130) return "Elevated systolic blood pressure";
      return null;
    },
  },
  {
    field: "diastolicBP",
    validator: (value, formData) => {
      const diastolic = parseInt(value);
      if (isNaN(diastolic)) return null;
      if (diastolic >= 90) return "High diastolic blood pressure";
      if (diastolic >= 80) return "Elevated diastolic blood pressure";
      return null;
    },
  },
  {
    field: "heartRate",
    validator: (value) => {
      const hr = parseInt(value);
      if (isNaN(hr)) return null;
      if (hr < 60) return "Low heart rate";
      if (hr > 100) return "High heart rate";
      return null;
    },
  },
  {
    field: "ecgResult",
    validator: (value) => {
      if (value === "abnormal") return "Abnormal ECG";
      return null;
    },
  },
  {
    field: "totalCholesterol",
    validator: (value) => {
      const total = parseInt(value);
      if (isNaN(total)) return null;
      if (total >= 240) return "High total cholesterol";
      return null;
    },
  },
  {
    field: "ldlCholesterol",
    validator: (value) => {
      const ldl = parseInt(value);
      if (isNaN(ldl)) return null;
      if (ldl >= 160) return "High LDL cholesterol";
      return null;
    },
  },
  {
    field: "hdlCholesterol",
    validator: (value) => {
      const hdl = parseInt(value);
      if (isNaN(hdl)) return null;
      if (hdl < 40) return "Low HDL cholesterol";
      return null;
    },
  },
  {
    field: "triglycerides",
    validator: (value) => {
      const trigly = parseInt(value);
      if (isNaN(trigly)) return null;
      if (trigly >= 200) return "High triglycerides";
      return null;
    },
  },
];

const CardiovascularHealthForm: React.FC<CardiovascularHealthFormProps> = ({
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
  } = useFormValidation(
    initialCardiovascularData,
    cardiovascularValidationRules
  );

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleSubmit = () => {
    const requiredFields: (keyof CardiovascularData)[] = [
      "systolicBP",
      "diastolicBP",
      "heartRate",
      "date",
    ];

    if (!isFormValid(requiredFields)) {
      showToast(
        "Please fill in at least Blood Pressure, Heart Rate, and Date",
        "error"
      );
      return;
    }

    const validation = getValidationStatus();
    onSubmit(formData, validation.isNormal);
    showToast("Cardiovascular data recorded successfully", "success");
    onClose();
  };

  const requiredFields: (keyof CardiovascularData)[] = [
    "systolicBP",
    "diastolicBP",
    "heartRate",
    "date",
  ];
  const formValid = isFormValid(requiredFields);
  const validation = getValidationStatus();

  return (
    <UnifiedHealthModal
      visible={visible}
      onClose={onClose}
      title="Cardiovascular Reading"
      subtitle="Record your blood pressure, heart rate, and cholesterol levels"
      icon="heart-outline"
    >
      {/* Date Selection */}
      <UnifiedDatePicker
        label="Test Date"
        value={new Date(formData.date)}
        onChange={(date) => updateFormData("date", format(date, "yyyy-MM-dd"))}
        required
        icon="calendar-outline"
      />

      {/* Blood Pressure Section */}
      <UnifiedFormSection
        title="Blood Pressure"
        icon="pulse-outline"
        description="Systolic and diastolic readings"
      >
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Systolic"
              value={formData.systolicBP}
              onChangeText={(text) => updateFormData("systolicBP", text)}
              placeholder="120"
              unit="mmHg"
              keyboardType="numeric"
              required
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Diastolic"
              value={formData.diastolicBP}
              onChangeText={(text) => updateFormData("diastolicBP", text)}
              placeholder="80"
              unit="mmHg"
              keyboardType="numeric"
              required
            />
          </View>
        </View>
      </UnifiedFormSection>

      {/* Heart Rate */}
      <UnifiedFormField
        label="Heart Rate"
        value={formData.heartRate}
        onChangeText={(text) => updateFormData("heartRate", text)}
        placeholder="72"
        unit="BPM"
        keyboardType="numeric"
        required
        icon="heart-outline"
        helperText="Normal range: 60-100 BPM"
      />

      {/* ECG Section */}
      <UnifiedFormSection
        title="ECG Results (Optional)"
        icon="fitness-outline"
        description="Electrocardiogram findings"
      >
        <UnifiedToggle
          label="ECG Result"
          options={[
            {
              label: "Normal",
              value: "normal",
              icon: "checkmark-circle-outline",
            },
            {
              label: "Abnormal",
              value: "abnormal",
              icon: "alert-circle-outline",
            },
            { label: "Not Done", value: "", icon: "close-circle-outline" },
          ]}
          selectedValue={formData.ecgResult}
          onSelect={(value) => updateFormData("ecgResult", value as string)}
        />

        {formData.ecgResult === "abnormal" && (
          <UnifiedFormField
            label="ECG Notes"
            value={formData.ecgNotes}
            onChangeText={(text) => updateFormData("ecgNotes", text)}
            placeholder="Describe abnormal findings..."
            multiline
            icon="document-text-outline"
          />
        )}
      </UnifiedFormSection>

      {/* Cholesterol Section */}
      <UnifiedFormSection
        title="Cholesterol Levels (Optional)"
        icon="water-outline"
        description="Lipid panel results"
      >
        <View
          className="flex-row"
          style={{ gap: scale(12), marginBottom: getSpacing(0) }}
        >
          <View className="flex-1">
            <UnifiedFormField
              label="Total"
              value={formData.totalCholesterol}
              onChangeText={(text) => updateFormData("totalCholesterol", text)}
              placeholder="200"
              unit="mg/dL"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="LDL"
              value={formData.ldlCholesterol}
              onChangeText={(text) => updateFormData("ldlCholesterol", text)}
              placeholder="100"
              unit="mg/dL"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="HDL"
              value={formData.hdlCholesterol}
              onChangeText={(text) => updateFormData("hdlCholesterol", text)}
              placeholder="40"
              unit="mg/dL"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Triglycerides"
              value={formData.triglycerides}
              onChangeText={(text) => updateFormData("triglycerides", text)}
              placeholder="150"
              unit="mg/dL"
              keyboardType="numeric"
            />
          </View>
        </View>
      </UnifiedFormSection>

      {/* Validation Summary */}
      {formValid && !validation.isNormal && (
        <UnifiedValidationSummary errors={validation.issues} warnings={[]} />
      )}

      {/* Action Buttons */}
      <View
        className="flex-row"
        style={{ gap: scale(12), marginTop: getSpacing(8) }}
      >
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
            title="Save Reading"
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

export default CardiovascularHealthForm;
