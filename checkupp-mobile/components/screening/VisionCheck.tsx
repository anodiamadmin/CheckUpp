import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { format } from "date-fns";
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
  VISUAL_ACUITY_OPTIONS,
  VISION_CORRECTION_OPTIONS,
} from "@/constants/formConstants";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import {
  getSpacing,
  scale,
  getFontSize,
  isSmallDevice,
} from "@/lib/utils/responsiveUtils";

export interface VisionReading {
  id: string;
  date: string;
  visualAcuity: {
    rightEye: string;
    leftEye: string;
    bothEyes: string;
  };
  colorVision?: {
    result: "normal" | "abnormal";
    details?: string;
  };
  peripheralVision?: {
    result: "normal" | "abnormal";
    details?: string;
  };
  eyePressure?: {
    rightEye?: number;
    leftEye?: number;
  };
  symptoms: {
    blurredVision: boolean;
    eyeStrain: boolean;
    headaches: boolean;
    dryEyes: boolean;
    nightVision: boolean;
    doubleVision: boolean;
  };
  glassesOrContacts: "none" | "glasses" | "contacts" | "both";
  notes?: string;
  wasNormal: boolean;
  createdAt: string;
}

interface VisionData {
  rightEyeAcuity: string;
  leftEyeAcuity: string;
  bothEyesAcuity: string;
  colorVisionResult: "normal" | "abnormal" | "";
  colorVisionDetails: string;
  peripheralVisionResult: "normal" | "abnormal" | "";
  peripheralVisionDetails: string;
  rightEyePressure: string;
  leftEyePressure: string;
  blurredVision: boolean;
  eyeStrain: boolean;
  headaches: boolean;
  dryEyes: boolean;
  nightVision: boolean;
  doubleVision: boolean;
  glassesOrContacts: "none" | "glasses" | "contacts" | "both";
  notes: string;
  date: string;
}

interface VisionCheckFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: VisionData, wasNormal: boolean) => void;
  history?: ScreeningHistory;
}

// Initial form data
const initialVisionData: VisionData = {
  rightEyeAcuity: "",
  leftEyeAcuity: "",
  bothEyesAcuity: "",
  colorVisionResult: "",
  colorVisionDetails: "",
  peripheralVisionResult: "",
  peripheralVisionDetails: "",
  rightEyePressure: "",
  leftEyePressure: "",
  blurredVision: false,
  eyeStrain: false,
  headaches: false,
  dryEyes: false,
  nightVision: false,
  doubleVision: false,
  glassesOrContacts: "none",
  notes: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

// Validation rules
const visionValidationRules: ValidationRule<VisionData>[] = [
  {
    field: "rightEyeAcuity",
    validator: (value) => {
      if (!value) return null;
      const normalValues = ["6/6", "6/7.5", "6/9", "6/12"];
      if (!normalValues.includes(value)) {
        if (["CF", "HM", "LP", "NPL"].includes(value)) {
          return "Severe vision impairment in right eye";
        }
        return "Reduced vision in right eye";
      }
      return null;
    },
  },
  {
    field: "leftEyeAcuity",
    validator: (value) => {
      if (!value) return null;
      const normalValues = ["6/6", "6/7.5", "6/9", "6/12"];
      if (!normalValues.includes(value)) {
        if (["CF", "HM", "LP", "NPL"].includes(value)) {
          return "Severe vision impairment in left eye";
        }
        return "Reduced vision in left eye";
      }
      return null;
    },
  },
  {
    field: "bothEyesAcuity",
    validator: (value) => {
      if (!value) return null;
      const normalValues = ["6/6", "6/7.5", "6/9", "6/12"];
      if (!normalValues.includes(value)) {
        if (["CF", "HM", "LP", "NPL"].includes(value)) {
          return "Severe vision impairment in both eyes";
        }
        return "Reduced vision in both eyes";
      }
      return null;
    },
  },
  {
    field: "colorVisionResult",
    validator: (value) => {
      if (value === "abnormal") return "Color vision deficiency";
      return null;
    },
  },
  {
    field: "peripheralVisionResult",
    validator: (value) => {
      if (value === "abnormal") return "Peripheral vision problems";
      return null;
    },
  },
  {
    field: "rightEyePressure",
    validator: (value, formData) => {
      const issues = [];
      const rightPressure = parseFloat(value);
      const leftPressure = parseFloat(formData.leftEyePressure);

      if (!isNaN(rightPressure) && (rightPressure > 21 || rightPressure < 10)) {
        issues.push("Abnormal eye pressure (right eye)");
      }
      if (!isNaN(leftPressure) && (leftPressure > 21 || leftPressure < 10)) {
        issues.push("Abnormal eye pressure (left eye)");
      }
      return issues.length > 0 ? issues.join(", ") : null;
    },
  },
  {
    field: "blurredVision",
    validator: (value, formData) => {
      const symptoms = [
        value && "Blurred vision",
        formData.eyeStrain && "Eye strain",
        formData.headaches && "Headaches",
        formData.dryEyes && "Dry eyes",
        formData.nightVision && "Night vision problems",
        formData.doubleVision && "Double vision",
      ].filter(Boolean);

      if (symptoms.length > 0) {
        return `Symptoms present: ${symptoms.join(", ")}`;
      }
      return null;
    },
  },
];

const VisionCheckForm: React.FC<VisionCheckFormProps> = ({
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
  } = useFormValidation(initialVisionData, visionValidationRules);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleSubmit = () => {
    const requiredFields: (keyof VisionData)[] = ["date"];

    const hasAcuityMeasurement =
      formData.rightEyeAcuity ||
      formData.leftEyeAcuity ||
      formData.bothEyesAcuity;

    if (!isFormValid(requiredFields) || !hasAcuityMeasurement) {
      showToast(
        "Please fill in at least one visual acuity measurement and date",
        "error"
      );
      return;
    }

    const validation = getValidationStatus();
    onSubmit(formData, validation.isNormal);
    showToast("Vision screening data recorded successfully", "success");
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

  // Render test result buttons
  const renderTestButtons = (
    label: string,
    value: string,
    onValueChange: (value: string) => void
  ) => (
    <View style={{ marginBottom: getSpacing(12) }}>
      <Text
        className="font-pmedium text-gray-700"
        style={{
          fontSize: getFontSize(13),
          marginBottom: getSpacing(8),
        }}
      >
        {label}
      </Text>
      <View className="flex-row" style={{ gap: scale(8) }}>
        <TouchableOpacity
          onPress={() => onValueChange("normal")}
          className="flex-1 rounded-lg items-center justify-center"
          style={{
            paddingVertical: getSpacing(12),
            backgroundColor: value === "normal" ? "#FF9C01" : "#F5F5F5",
            borderWidth: 1,
            borderColor: value === "normal" ? "#FF9C01" : "#E5E7EB",
          }}
        >
          <Text
            className="font-pmedium"
            style={{
              fontSize: getFontSize(13),
              color: value === "normal" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Normal
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onValueChange("abnormal")}
          className="flex-1 rounded-lg items-center justify-center"
          style={{
            paddingVertical: getSpacing(12),
            backgroundColor: value === "abnormal" ? "#FF9C01" : "#F5F5F5",
            borderWidth: 1,
            borderColor: value === "abnormal" ? "#FF9C01" : "#E5E7EB",
          }}
        >
          <Text
            className="font-pmedium"
            style={{
              fontSize: getFontSize(13),
              color: value === "abnormal" ? "#FFFFFF" : "#6B7280",
            }}
          >
            Abnormal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const requiredFields: (keyof VisionData)[] = ["date"];
  const hasAcuityMeasurement =
    formData.rightEyeAcuity ||
    formData.leftEyeAcuity ||
    formData.bothEyesAcuity;
  const formValid = isFormValid(requiredFields) && hasAcuityMeasurement;
  const validation = getValidationStatus();

  return (
    <UnifiedHealthModal
      visible={visible}
      onClose={onClose}
      title="Vision Test"
      subtitle="Track your visual acuity and eye health"
      icon="eye-outline"
    >
      {/* Date Selection */}
      <UnifiedDatePicker
        label="Test Date"
        value={new Date(formData.date)}
        onChange={(date) => updateFormData("date", format(date, "yyyy-MM-dd"))}
        required
        icon="calendar-outline"
      />

      {/* Visual Acuity Section */}
      <UnifiedFormSection
        title="Visual Acuity (Snellen Chart)"
        icon="eye-outline"
        description="Visual clarity measurement for each eye"
      >
        <UnifiedPicker
          label="Right Eye"
          value={formData.rightEyeAcuity}
          options={VISUAL_ACUITY_OPTIONS}
          onSelect={(value) => updateFormData("rightEyeAcuity", value)}
          placeholder="Select acuity"
          icon="eye-outline"
        />

        <UnifiedPicker
          label="Left Eye"
          value={formData.leftEyeAcuity}
          options={VISUAL_ACUITY_OPTIONS}
          onSelect={(value) => updateFormData("leftEyeAcuity", value)}
          placeholder="Select acuity"
          icon="eye-outline"
        />

        <UnifiedPicker
          label="Both Eyes"
          value={formData.bothEyesAcuity}
          options={VISUAL_ACUITY_OPTIONS}
          onSelect={(value) => updateFormData("bothEyesAcuity", value)}
          placeholder="Select acuity"
          icon="eye-outline"
        />
      </UnifiedFormSection>

      {/* Vision Tests Section */}
      <UnifiedFormSection
        title="Specialized Vision Tests"
        icon="scan-outline"
        description="Color and peripheral vision assessment"
      >
        {renderTestButtons(
          "Color Vision Test",
          formData.colorVisionResult,
          (value) => updateFormData("colorVisionResult", value)
        )}

        {formData.colorVisionResult === "abnormal" && (
          <UnifiedFormField
            label="Color Vision Details"
            value={formData.colorVisionDetails}
            onChangeText={(text) => updateFormData("colorVisionDetails", text)}
            placeholder="Describe color vision issues..."
            multiline
          />
        )}

        {renderTestButtons(
          "Peripheral Vision Test",
          formData.peripheralVisionResult,
          (value) => updateFormData("peripheralVisionResult", value)
        )}

        {formData.peripheralVisionResult === "abnormal" && (
          <UnifiedFormField
            label="Peripheral Vision Details"
            value={formData.peripheralVisionDetails}
            onChangeText={(text) =>
              updateFormData("peripheralVisionDetails", text)
            }
            placeholder="Describe peripheral vision issues..."
            multiline
          />
        )}
      </UnifiedFormSection>

      {/* Eye Pressure Section */}
      <UnifiedFormSection
        title="Eye Pressure (Tonometry)"
        icon="speedometer-outline"
        description="Intraocular pressure measurement"
      >
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Right Eye"
              value={formData.rightEyePressure}
              onChangeText={(text) => updateFormData("rightEyePressure", text)}
              placeholder="15"
              unit="mmHg"
              keyboardType="numeric"
              helperText="Normal: 10-21 mmHg"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Left Eye"
              value={formData.leftEyePressure}
              onChangeText={(text) => updateFormData("leftEyePressure", text)}
              placeholder="15"
              unit="mmHg"
              keyboardType="numeric"
              helperText="Normal: 10-21 mmHg"
            />
          </View>
        </View>
      </UnifiedFormSection>

      {/* Vision Correction Section */}
      <UnifiedFormSection
        title="Vision Correction"
        icon="construct-outline"
        description="Current corrective lenses usage"
      >
        <UnifiedPicker
          label="Do you wear glasses or contacts?"
          value={formData.glassesOrContacts}
          options={VISION_CORRECTION_OPTIONS}
          onSelect={(value) => updateFormData("glassesOrContacts", value)}
          icon="glasses-outline"
        />
      </UnifiedFormSection>

      {/* Symptoms Section */}
      <UnifiedFormSection
        title="Vision Symptoms"
        icon="alert-circle-outline"
        description="Current eye-related symptoms"
      >
        <CheckboxItem
          label="Blurred vision"
          value={formData.blurredVision}
          onValueChange={(value) => updateFormData("blurredVision", value)}
        />

        <CheckboxItem
          label="Eye strain or fatigue"
          value={formData.eyeStrain}
          onValueChange={(value) => updateFormData("eyeStrain", value)}
        />

        <CheckboxItem
          label="Headaches"
          value={formData.headaches}
          onValueChange={(value) => updateFormData("headaches", value)}
        />

        <CheckboxItem
          label="Dry eyes"
          value={formData.dryEyes}
          onValueChange={(value) => updateFormData("dryEyes", value)}
        />

        <CheckboxItem
          label="Poor night vision"
          value={formData.nightVision}
          onValueChange={(value) => updateFormData("nightVision", value)}
        />

        <CheckboxItem
          label="Double vision"
          value={formData.doubleVision}
          onValueChange={(value) => updateFormData("doubleVision", value)}
        />
      </UnifiedFormSection>

      {/* Notes Section */}
      <UnifiedFormSection
        title="Additional Notes"
        icon="document-text-outline"
        description="Other vision concerns or observations"
        isLast
      >
        <UnifiedFormField
          label="Notes"
          value={formData.notes}
          onChangeText={(text) => updateFormData("notes", text)}
          placeholder="Any other vision concerns or observations..."
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

export default VisionCheckForm;
