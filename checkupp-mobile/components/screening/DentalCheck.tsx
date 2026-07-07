import React, { useEffect } from "react";
import { View, Text, Switch } from "react-native";
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
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import {
  getSpacing,
  getFontSize,
  isSmallDevice,
  scale,
} from "@/lib/utils/responsiveUtils";

export interface DentalReading {
  id: string;
  date: string;
  oralHygiene: {
    brushingFrequency:
      | "never"
      | "rarely"
      | "once-daily"
      | "twice-daily"
      | "more";
    flossingFrequency: "never" | "rarely" | "weekly" | "daily";
    mouthwashUse: boolean;
  };
  teethCondition: {
    cavities: number;
    fillings: number;
    missingTeeth: number;
    crowns: number;
    implants: number;
  };
  gumHealth: {
    bleeding: boolean;
    swelling: boolean;
    recession: boolean;
    sensitivity: boolean;
  };
  symptoms: {
    toothache: boolean;
    jawPain: boolean;
    badBreath: boolean;
    dryMouth: boolean;
    grinding: boolean;
    sensitivity: boolean;
  };
  lastCleaning: string;
  lastXray: string;
  orthodontics: "none" | "braces" | "retainer" | "invisalign";
  smokingStatus: "never" | "former" | "current";
  notes?: string;
  wasNormal: boolean;
  createdAt: string;
}

interface DentalData {
  brushingFrequency: "never" | "rarely" | "once-daily" | "twice-daily" | "more";
  flossingFrequency: "never" | "rarely" | "weekly" | "daily";
  mouthwashUse: boolean;
  cavities: string;
  fillings: string;
  missingTeeth: string;
  crowns: string;
  implants: string;
  gumBleeding: boolean;
  gumSwelling: boolean;
  gumRecession: boolean;
  gumSensitivity: boolean;
  toothache: boolean;
  jawPain: boolean;
  badBreath: boolean;
  dryMouth: boolean;
  grinding: boolean;
  toothSensitivity: boolean;
  lastCleaning: string;
  lastXray: string;
  orthodontics: "none" | "braces" | "retainer" | "invisalign";
  smokingStatus: "never" | "former" | "current";
  notes: string;
  date: string;
}

interface DentalCheckFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: DentalData, wasNormal: boolean) => void;
  history?: ScreeningHistory;
}

// Initial form data
const initialDentalData: DentalData = {
  brushingFrequency: "twice-daily",
  flossingFrequency: "daily",
  mouthwashUse: false,
  cavities: "",
  fillings: "",
  missingTeeth: "",
  crowns: "",
  implants: "",
  gumBleeding: false,
  gumSwelling: false,
  gumRecession: false,
  gumSensitivity: false,
  toothache: false,
  jawPain: false,
  badBreath: false,
  dryMouth: false,
  grinding: false,
  toothSensitivity: false,
  lastCleaning: format(new Date(), "yyyy-MM-dd"),
  lastXray: format(new Date(), "yyyy-MM-dd"),
  orthodontics: "none",
  smokingStatus: "never",
  notes: "",
  date: format(new Date(), "yyyy-MM-dd"),
};

// Validation rules
const dentalValidationRules: ValidationRule<DentalData>[] = [
  {
    field: "brushingFrequency",
    validator: (value) => {
      if (value === "never" || value === "rarely") {
        return "Poor brushing habits";
      }
      return null;
    },
  },
  {
    field: "flossingFrequency",
    validator: (value) => {
      if (value === "never" || value === "rarely") {
        return "Inadequate flossing";
      }
      return null;
    },
  },
  {
    field: "cavities",
    validator: (value) => {
      const cavities = parseInt(value) || 0;
      if (cavities > 0) {
        return `${cavities} cavities present`;
      }
      return null;
    },
  },
  {
    field: "missingTeeth",
    validator: (value) => {
      const missingTeeth = parseInt(value) || 0;
      if (missingTeeth > 0) {
        return `${missingTeeth} missing teeth`;
      }
      return null;
    },
  },
  {
    field: "gumBleeding",
    validator: (value, formData) => {
      const gumIssues = [];
      if (value) gumIssues.push("bleeding");
      if (formData.gumSwelling) gumIssues.push("swelling");
      if (formData.gumRecession) gumIssues.push("recession");
      if (formData.gumSensitivity) gumIssues.push("sensitivity");

      if (gumIssues.length > 0) {
        return `Gum problems: ${gumIssues.join(", ")}`;
      }
      return null;
    },
  },
  {
    field: "toothache",
    validator: (value, formData) => {
      const symptoms = [];
      if (value) symptoms.push("toothache");
      if (formData.jawPain) symptoms.push("jaw pain");
      if (formData.badBreath) symptoms.push("bad breath");
      if (formData.dryMouth) symptoms.push("dry mouth");
      if (formData.grinding) symptoms.push("teeth grinding");
      if (formData.toothSensitivity) symptoms.push("tooth sensitivity");

      if (symptoms.length > 0) {
        return `Symptoms: ${symptoms.join(", ")}`;
      }
      return null;
    },
  },
  {
    field: "smokingStatus",
    validator: (value) => {
      if (value === "current") {
        return "Current smoking (affects oral health)";
      }
      return null;
    },
  },
  {
    field: "lastCleaning",
    validator: (value) => {
      const lastCleaning = new Date(value);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (lastCleaning < sixMonthsAgo) {
        return "Overdue for dental cleaning";
      }
      return null;
    },
  },
];

// Picker options
const brushingFrequencyOptions = [
  { label: "Never", value: "never" },
  { label: "Rarely", value: "rarely" },
  { label: "Once daily", value: "once-daily" },
  { label: "Twice daily", value: "twice-daily" },
  { label: "More than twice daily", value: "more" },
];

const flossingFrequencyOptions = [
  { label: "Never", value: "never" },
  { label: "Rarely", value: "rarely" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

const orthodonticsOptions = [
  { label: "None", value: "none" },
  { label: "Braces", value: "braces" },
  { label: "Retainer", value: "retainer" },
  { label: "Invisalign", value: "invisalign" },
];

const smokingStatusOptions = [
  { label: "Never", value: "never" },
  { label: "Former smoker", value: "former" },
  { label: "Current smoker", value: "current" },
];

const DentalCheckForm: React.FC<DentalCheckFormProps> = ({
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
  } = useFormValidation(initialDentalData, dentalValidationRules);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleSubmit = () => {
    const requiredFields: (keyof DentalData)[] = ["date", "lastCleaning"];

    if (!isFormValid(requiredFields)) {
      showToast("Please fill in the date and last cleaning date", "error");
      return;
    }

    const validation = getValidationStatus();
    onSubmit(formData, validation.isNormal);
    showToast("Dental health data recorded successfully", "success");
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

  const requiredFields: (keyof DentalData)[] = ["date", "lastCleaning"];
  const formValid = isFormValid(requiredFields);
  const validation = getValidationStatus();

  return (
    <UnifiedHealthModal
      visible={visible}
      onClose={onClose}
      title="Dental Health Check"
      subtitle="Track your oral hygiene and dental health"
      icon="flash-outline"
    >
      {/* Date Selection */}
      <UnifiedDatePicker
        label="Check Date"
        value={new Date(formData.date)}
        onChange={(date) => updateFormData("date", format(date, "yyyy-MM-dd"))}
        required
        icon="calendar-outline"
      />
      {/* Oral Hygiene Section */}
      <UnifiedFormSection
        title="Oral Hygiene Habits"
        icon="brush-outline"
        description="Daily dental care routine"
      >
        <UnifiedPicker
          label="Brushing Frequency"
          value={formData.brushingFrequency}
          options={brushingFrequencyOptions}
          onSelect={(value) => updateFormData("brushingFrequency", value)}
          icon="brush-outline"
        />

        <UnifiedPicker
          label="Flossing Frequency"
          value={formData.flossingFrequency}
          options={flossingFrequencyOptions}
          onSelect={(value) => updateFormData("flossingFrequency", value)}
          icon="git-branch-outline"
        />

        <CheckboxItem
          label="Use mouthwash regularly"
          value={formData.mouthwashUse}
          onValueChange={(value) => updateFormData("mouthwashUse", value)}
        />
      </UnifiedFormSection>

      {/* Dental Condition Section */}
      <UnifiedFormSection
        title="Current Dental Condition"
        icon="medical-outline"
        description="Teeth status and treatments"
      >
        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Cavities"
              value={formData.cavities}
              onChangeText={(text) => updateFormData("cavities", text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Fillings"
              value={formData.fillings}
              onChangeText={(text) => updateFormData("fillings", text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View className="flex-row" style={{ gap: scale(12) }}>
          <View className="flex-1">
            <UnifiedFormField
              label="Missing"
              value={formData.missingTeeth}
              onChangeText={(text) => updateFormData("missingTeeth", text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <UnifiedFormField
              label="Crowns"
              value={formData.crowns}
              onChangeText={(text) => updateFormData("crowns", text)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <UnifiedFormField
          label="Implants"
          value={formData.implants}
          onChangeText={(text) => updateFormData("implants", text)}
          placeholder="0"
          keyboardType="numeric"
        />
      </UnifiedFormSection>

      {/* Gum Health Section */}
      <UnifiedFormSection
        title="Gum Health"
        icon="water-outline"
        description="Gum condition indicators"
      >
        <CheckboxItem
          label="Bleeding gums"
          value={formData.gumBleeding}
          onValueChange={(value) => updateFormData("gumBleeding", value)}
        />

        <CheckboxItem
          label="Swollen gums"
          value={formData.gumSwelling}
          onValueChange={(value) => updateFormData("gumSwelling", value)}
        />

        <CheckboxItem
          label="Gum recession"
          value={formData.gumRecession}
          onValueChange={(value) => updateFormData("gumRecession", value)}
        />

        <CheckboxItem
          label="Gum sensitivity"
          value={formData.gumSensitivity}
          onValueChange={(value) => updateFormData("gumSensitivity", value)}
        />
      </UnifiedFormSection>

      {/* Symptoms Section */}
      <UnifiedFormSection
        title="Current Symptoms"
        icon="alert-circle-outline"
        description="Any pain or discomfort"
      >
        <CheckboxItem
          label="Toothache"
          value={formData.toothache}
          onValueChange={(value) => updateFormData("toothache", value)}
        />

        <CheckboxItem
          label="Jaw pain or TMJ"
          value={formData.jawPain}
          onValueChange={(value) => updateFormData("jawPain", value)}
        />

        <CheckboxItem
          label="Bad breath (halitosis)"
          value={formData.badBreath}
          onValueChange={(value) => updateFormData("badBreath", value)}
        />

        <CheckboxItem
          label="Dry mouth"
          value={formData.dryMouth}
          onValueChange={(value) => updateFormData("dryMouth", value)}
        />

        <CheckboxItem
          label="Teeth grinding (bruxism)"
          value={formData.grinding}
          onValueChange={(value) => updateFormData("grinding", value)}
        />

        <CheckboxItem
          label="Tooth sensitivity"
          value={formData.toothSensitivity}
          onValueChange={(value) => updateFormData("toothSensitivity", value)}
        />
      </UnifiedFormSection>

      {/* Professional Care Section */}
      <UnifiedFormSection
        title="Professional Care"
        icon="medkit-outline"
        description="Dental visits and treatments"
      >
        <UnifiedDatePicker
          label="Last Dental Cleaning"
          value={new Date(formData.lastCleaning)}
          onChange={(date) =>
            updateFormData("lastCleaning", format(date, "yyyy-MM-dd"))
          }
          required
          icon="medical-outline"
        />

        <UnifiedDatePicker
          label="Last X-ray"
          value={new Date(formData.lastXray)}
          onChange={(date) =>
            updateFormData("lastXray", format(date, "yyyy-MM-dd"))
          }
          icon="scan-outline"
        />
      </UnifiedFormSection>

      {/* Additional Information Section */}
      <UnifiedFormSection
        title="Additional Information"
        icon="information-circle-outline"
        description="Lifestyle and treatments"
        isLast
      >
        <UnifiedPicker
          label="Orthodontic Treatment"
          value={formData.orthodontics}
          options={orthodonticsOptions}
          onSelect={(value) => updateFormData("orthodontics", value)}
          icon="options-outline"
        />

        <UnifiedPicker
          label="Smoking Status"
          value={formData.smokingStatus}
          options={smokingStatusOptions}
          onSelect={(value) => updateFormData("smokingStatus", value)}
          icon="cloud-outline"
        />

        <UnifiedFormField
          label="Additional Notes"
          value={formData.notes}
          onChangeText={(text) => updateFormData("notes", text)}
          placeholder="Any additional dental concerns or notes..."
          multiline
          icon="document-text-outline"
        />
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
            title="Save Check"
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

export default DentalCheckForm;
