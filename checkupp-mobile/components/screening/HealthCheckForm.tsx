import {
  Text,
  View,
  Modal,
  Alert,
  Switch,
  Animated,
  TouchableOpacity,
} from "react-native";
import { format } from "date-fns";
import { Gender } from "@/app/(tabs)/health-screening";
import { Ionicons } from "@expo/vector-icons";
import CustomButton from "@/components/CustomButton";
import HistoryViewer from "./HistoryViewer";
import YearPickerModal from "./YearPickerModal";
import ScreeningNextSteps, {
  ensureAutomaticBookingReminder,
} from "./ScreeningNextSteps";
import CardiovascularHealthForm from "./CardiovascularHealth";
import DiabetesCheckForm from "./DiabetesCheck";
import VisionCheckForm from "./VisionCheck";
import DentalCheckForm from "./DentalCheck";
import MentalHealthCheckForm from "./MentalHealthCheck";
import { HealthCheckItem } from "@/lib/utils/nutritionChecks";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import { useToast } from "@/components/ToastProvider";
import {
  BookingChannel,
  BookingStatus,
  BookingStatusDetails,
  ScreeningResultRecord,
} from "@/lib/screening/bookingFlow";
import {
  scale,
  getFontSize,
  getSpacing,
  isSmallDevice,
  screenDimensions,
} from "@/lib/utils/responsiveUtils";
import { formatStoredDate } from "@/lib/utils/dateFormatConverter";

const { width } = screenDimensions;

type HealthCheckFormProps = {
  neverCheckedHealth: boolean;
  setNeverCheckedHealth: (value: boolean) => void;
  healthCheckDate: Date | undefined;
  setHealthCheckDate: (date: Date | undefined) => void;
  healthCheckDates: HealthCheckItem[];
  handleCalculateHealth: () => void;
  age: number | undefined;
  gender: Gender;
  onTestResultSubmit: (
    checkName: string,
    wasNormal: boolean,
    date: string,
    resultValue?: string,
  ) => void;
  onBookingStatusChange: (
    name: string,
    type: "cancer" | "health",
    status: BookingStatus,
    channel?: BookingChannel,
    details?: BookingStatusDetails,
  ) => void;
  onBookingDeferred?: (name: string, type: "cancer" | "health") => void;
  healthResults: Record<string, ScreeningResultRecord>;
  history?: ScreeningHistory;
};

const HealthCheckForm = ({
  neverCheckedHealth,
  setNeverCheckedHealth,
  healthCheckDate,
  setHealthCheckDate,
  healthCheckDates,
  handleCalculateHealth,
  age,
  gender,
  onTestResultSubmit,
  onBookingStatusChange,
  onBookingDeferred,
  healthResults,
  history = {},
}: HealthCheckFormProps) => {
  const [showHealthYearPicker, setShowHealthYearPicker] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<HealthCheckItem | null>(
    null,
  );
  const [showHadCheckModal, setShowHadCheckModal] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCheckHistory, setSelectedCheckHistory] = useState<string>("");
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingCheck, setBookingCheck] = useState<HealthCheckItem | null>(
    null,
  );
  const [bookingModalSource, setBookingModalSource] = useState<
    "not_had" | "abnormal" | null
  >(null);

  // Modal states for each health check form
  const [showCardiovascularForm, setShowCardiovascularForm] = useState(false);
  const [showDiabetesForm, setShowDiabetesForm] = useState(false);
  const [showVisionForm, setShowVisionForm] = useState(false);
  const [showDentalForm, setShowDentalForm] = useState(false);
  const [showMentalHealthForm, setShowMentalHealthForm] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [healthCheckDates, fadeAnim]);

  const handleYearChange = (selectedYear: number) => {
    const updatedDate = new Date();
    updatedDate.setFullYear(selectedYear);
    updatedDate.setMonth(new Date().getMonth());
    updatedDate.setDate(new Date().getDate());
    setHealthCheckDate(updatedDate);
    setShowHealthYearPicker(false);
  };

  const handleCalculateWithValidation = () => {
    if (!neverCheckedHealth && !healthCheckDate) {
      showToast(
        "Please either select 'Never had a checkup' or choose your last health checkup year.",
        "info",
      );
      return;
    }
    handleCalculateHealth();
  };

  const handleCheckSelection = (check: HealthCheckItem) => {
    setSelectedCheck(check);

    if (!check.eligible) {
      setShowEligibilityModal(true);
    } else {
      setShowHadCheckModal(true);
    }
  };

  const handleEligibilityOverride = (proceed: boolean) => {
    setShowEligibilityModal(false);
    if (proceed) {
      setShowHadCheckModal(true);
    }
  };

  const handleViewAllHistory = () => {
    setSelectedCheckHistory("All Health Checks");
    setShowHistoryModal(true);
  };

  const scheduleAutomaticBookingReminder = (check: HealthCheckItem) => {
    void ensureAutomaticBookingReminder(check.name).catch((error) => {
      console.error("Failed to schedule automatic booking reminder:", error);
      showToast("Unable to schedule booking reminder automatically", "error");
    });
  };

  const openHealthCheckForm = (checkName: string) => {
    switch (checkName) {
      case "Cardiovascular Health":
        setShowCardiovascularForm(true);
        break;
      case "Diabetes Check":
        setShowDiabetesForm(true);
        break;
      case "Vision Check":
        setShowVisionForm(true);
        break;
      case "Dental Check":
        setShowDentalForm(true);
        break;
      case "Mental Health Check":
        setShowMentalHealthForm(true);
        break;
      default:
        // Fallback for any other health checks - could add more forms here
        showToast(`${checkName} form not available yet`, "info");
        break;
    }
  };

  const handleHadCheckResponse = (hadCheck: boolean) => {
    setShowHadCheckModal(false);
    if (!hadCheck) {
      if (selectedCheck) {
        setBookingCheck(selectedCheck);
        setBookingModalSource("not_had");
        setShowBookingModal(true);
        scheduleAutomaticBookingReminder(selectedCheck);
      }
      onTestResultSubmit(
        selectedCheck!.name,
        false,
        format(new Date(), "yyyy-MM-dd"),
      );
    } else {
      // Open the specific health check form instead of the generic result modal
      if (selectedCheck) {
        openHealthCheckForm(selectedCheck.name);
      }
    }
  };

  // Generic health check submit handler
  const createHealthCheckSubmitHandler = useCallback(
    (checkName: string, formatFunction: (data: any) => string) =>
      async (data: any, wasNormal: boolean) => {
        try {
          const formattedResult = formatFunction(data);
          await onTestResultSubmit(
            checkName,
            wasNormal,
            data.date,
            formattedResult,
          );
          if (!wasNormal) {
            const matchingCheck = healthCheckDates.find(
              (check) => check.name === checkName,
            );
            if (matchingCheck) {
              setBookingCheck(matchingCheck);
              setBookingModalSource("abnormal");
              setShowBookingModal(true);
              scheduleAutomaticBookingReminder(matchingCheck);
            }
          }
          // Close the specific form modal
          closeAllForms();
        } catch (error) {
          console.error(`Error saving ${checkName} data:`, error);
          showToast(`Failed to save ${checkName} data`, "error");
        }
      },
    [onTestResultSubmit, showToast],
  );

  const closeAllForms = () => {
    setShowCardiovascularForm(false);
    setShowDiabetesForm(false);
    setShowVisionForm(false);
    setShowDentalForm(false);
    setShowMentalHealthForm(false);
  };

  // Cardiovascular submit handler
  const handleCardiovascularSubmit = useMemo(
    () =>
      createHealthCheckSubmitHandler(
        "Cardiovascular Health",
        (data) =>
          `BP: ${data.systolicBP}/${data.diastolicBP} mmHg, HR: ${
            data.heartRate
          } BPM${data.ecgResult ? `, ECG: ${data.ecgResult}` : ""}${
            data.totalCholesterol
              ? `, Total Chol: ${data.totalCholesterol} mg/dL`
              : ""
          }${data.ldlCholesterol ? `, LDL: ${data.ldlCholesterol}` : ""}${
            data.hdlCholesterol ? `, HDL: ${data.hdlCholesterol}` : ""
          }${data.triglycerides ? `, Trig: ${data.triglycerides}` : ""}${
            data.ecgNotes ? `, Notes: ${data.ecgNotes}` : ""
          }`,
      ),
    [createHealthCheckSubmitHandler],
  );

  // Diabetes submit handler
  const handleDiabetesSubmit = useMemo(
    () =>
      createHealthCheckSubmitHandler("Diabetes Check", (data) => {
        const results = [];
        if (data.fastingGlucose)
          results.push(`Fasting: ${data.fastingGlucose} mmol/L`);
        if (data.randomGlucose)
          results.push(`Random: ${data.randomGlucose} mmol/L`);
        if (data.postMealGlucose)
          results.push(`Post-meal: ${data.postMealGlucose} mmol/L`);
        if (data.hba1c) results.push(`HbA1c: ${data.hba1c}%`);
        if (data.ketones) results.push(`Ketones: ${data.ketones} mmol/L`);
        if (data.systolicBP && data.diastolicBP) {
          results.push(`BP: ${data.systolicBP}/${data.diastolicBP} mmHg`);
        }
        if (data.weight && data.height) {
          const heightInM = parseFloat(data.height) / 100;
          const bmi = parseFloat(data.weight) / (heightInM * heightInM);
          results.push(`BMI: ${bmi.toFixed(1)}`);
        }
        if (data.notes) results.push(`Notes: ${data.notes}`);
        return results.join(", ");
      }),
    [createHealthCheckSubmitHandler],
  );

  // Vision submit handler
  const handleVisionSubmit = useMemo(
    () =>
      createHealthCheckSubmitHandler("Vision Check", (data) => {
        const results = [];
        if (data.rightEyeAcuity)
          results.push(`Right eye: ${data.rightEyeAcuity}`);
        if (data.leftEyeAcuity) results.push(`Left eye: ${data.leftEyeAcuity}`);
        if (data.bothEyesAcuity)
          results.push(`Both eyes: ${data.bothEyesAcuity}`);
        if (data.colorVisionResult && data.colorVisionResult !== "") {
          results.push(`Color vision: ${data.colorVisionResult}`);
        }
        if (data.peripheralVisionResult && data.peripheralVisionResult !== "") {
          results.push(`Peripheral vision: ${data.peripheralVisionResult}`);
        }
        if (data.rightEyePressure)
          results.push(`Right pressure: ${data.rightEyePressure} mmHg`);
        if (data.leftEyePressure)
          results.push(`Left pressure: ${data.leftEyePressure} mmHg`);
        if (data.glassesOrContacts !== "none") {
          results.push(`Correction: ${data.glassesOrContacts}`);
        }
        const symptoms = [];
        if (data.blurredVision) symptoms.push("blurred vision");
        if (data.eyeStrain) symptoms.push("eye strain");
        if (data.headaches) symptoms.push("headaches");
        if (data.dryEyes) symptoms.push("dry eyes");
        if (data.nightVision) symptoms.push("night vision problems");
        if (data.doubleVision) symptoms.push("double vision");
        if (symptoms.length > 0)
          results.push(`Symptoms: ${symptoms.join(", ")}`);
        if (data.notes) results.push(`Notes: ${data.notes}`);
        return results.join(", ");
      }),
    [createHealthCheckSubmitHandler],
  );

  // Dental submit handler
  const handleDentalSubmit = useMemo(
    () =>
      createHealthCheckSubmitHandler("Dental Check", (data) => {
        const results = [];
        results.push(`Brushing: ${data.brushingFrequency}`);
        results.push(`Flossing: ${data.flossingFrequency}`);
        if (data.mouthwashUse) results.push("Uses mouthwash");
        if (data.cavities) results.push(`Cavities: ${data.cavities}`);
        if (data.fillings) results.push(`Fillings: ${data.fillings}`);
        if (data.missingTeeth)
          results.push(`Missing teeth: ${data.missingTeeth}`);
        if (data.crowns) results.push(`Crowns: ${data.crowns}`);
        if (data.implants) results.push(`Implants: ${data.implants}`);

        const gumIssues = [];
        if (data.gumBleeding) gumIssues.push("bleeding");
        if (data.gumSwelling) gumIssues.push("swelling");
        if (data.gumRecession) gumIssues.push("recession");
        if (data.gumSensitivity) gumIssues.push("sensitivity");
        if (gumIssues.length > 0)
          results.push(`Gum issues: ${gumIssues.join(", ")}`);

        const symptoms = [];
        if (data.toothache) symptoms.push("toothache");
        if (data.jawPain) symptoms.push("jaw pain");
        if (data.badBreath) symptoms.push("bad breath");
        if (data.dryMouth) symptoms.push("dry mouth");
        if (data.grinding) symptoms.push("grinding");
        if (data.toothSensitivity) symptoms.push("tooth sensitivity");
        if (symptoms.length > 0)
          results.push(`Symptoms: ${symptoms.join(", ")}`);

        results.push(`Last cleaning: ${data.lastCleaning}`);
        results.push(`Last X-ray: ${data.lastXray}`);
        if (data.orthodontics !== "none")
          results.push(`Orthodontics: ${data.orthodontics}`);
        if (data.smokingStatus !== "never")
          results.push(`Smoking: ${data.smokingStatus}`);
        if (data.notes) results.push(`Notes: ${data.notes}`);
        return results.join(", ");
      }),
    [createHealthCheckSubmitHandler],
  );

  // Mental Health submit handler
  const handleMentalHealthSubmit = useMemo(
    () =>
      createHealthCheckSubmitHandler("Mental Health Check", (data) => {
        const results = [];
        if (data.k10Score) results.push(`K-10: ${data.k10Score}`);
        if (data.dass21DepressionScore)
          results.push(`DASS-21 Depression: ${data.dass21DepressionScore}`);
        if (data.dass21AnxietyScore)
          results.push(`DASS-21 Anxiety: ${data.dass21AnxietyScore}`);
        if (data.dass21StressScore)
          results.push(`DASS-21 Stress: ${data.dass21StressScore}`);
        if (data.sleepHours)
          results.push(`Sleep: ${data.sleepHours}h (${data.sleepQuality})`);
        results.push(`Exercise: ${data.exerciseFrequency}`);
        results.push(`Social support: ${data.socialSupport}`);
        results.push(`Work stress: ${data.workStress}`);
        if (data.substanceUse) results.push("Substance use reported");

        const symptoms = [];
        if (data.persistentSadness) symptoms.push("persistent sadness");
        if (data.lossOfInterest) symptoms.push("loss of interest");
        if (data.anxiousFeelings) symptoms.push("anxious feelings");
        if (data.irritability) symptoms.push("irritability");
        if (data.concentrationProblems) symptoms.push("concentration problems");
        if (data.fatigueOrLowEnergy) symptoms.push("fatigue");
        if (symptoms.length > 0)
          results.push(`Symptoms: ${symptoms.join(", ")}`);

        if (data.notes) results.push(`Notes: ${data.notes}`);
        return results.join(", ");
      }),
    [createHealthCheckSubmitHandler],
  );

  const getTotalHealthRecords = () => {
    return Object.values(history).reduce(
      (total, records) => total + records.length,
      0,
    );
  };

  const getLastRecordedDate = useCallback(
    (checkName: string) => {
      const record = healthResults[checkName];
      if (!record?.date) return null;
      return formatStoredDate(record.date, "yyyy-MM-dd") ?? record.date;
    },
    [healthResults],
  );

  const totalHealthRecords = getTotalHealthRecords();
  const isFormValid = neverCheckedHealth || healthCheckDate;

  return (
    <>
      <View
        className="bg-white rounded-xl border border-gray-100"
        style={{
          padding: scale(12),
          marginBottom: getSpacing(12),
        }}
      >
        <View style={{ marginBottom: getSpacing(12) }}>
          <Text
            className="font-psemibold text-gray-800"
            style={{
              fontSize: getFontSize(16),
              marginBottom: getSpacing(2),
            }}
          >
            Health Check History
          </Text>
          <Text
            className="font-pregular text-gray-600"
            style={{ fontSize: getFontSize(12) }}
          >
            Select your last health checkup date to calculate upcoming health
            screening dates
          </Text>
        </View>

        <View
          className="flex-row items-center justify-between bg-gray-50 rounded-lg"
          style={{
            marginBottom: getSpacing(16),
            padding: scale(10),
          }}
        >
          <Text
            className="font-pmedium text-gray-700"
            style={{ fontSize: getFontSize(13) }}
          >
            Never had a checkup
          </Text>
          <Switch
            value={neverCheckedHealth}
            onValueChange={setNeverCheckedHealth}
            thumbColor={neverCheckedHealth ? "#FF9C01" : "#f4f4f5"}
            trackColor={{ true: "#FFEED9", false: "#e5e7eb" }}
            ios_backgroundColor="#e5e7eb"
            style={{
              transform: [{ scale: isSmallDevice ? 0.8 : 1 }],
            }}
          />
        </View>

        {!neverCheckedHealth && (
          <View style={{ marginBottom: getSpacing(16) }}>
            <Text
              className="font-pmedium text-gray-700"
              style={{
                fontSize: getFontSize(13),
                marginBottom: getSpacing(6),
              }}
            >
              Last Health Checkup <Text className="text-red-500">*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowHealthYearPicker(true)}
              className={`border rounded-lg bg-gray-50 flex-row justify-between items-center ${
                !isFormValid ? "border-red-300" : "border-gray-200"
              }`}
              style={{
                paddingHorizontal: scale(12),
                paddingVertical: getSpacing(10),
              }}
            >
              <Text
                className="font-pregular text-gray-900"
                style={{ fontSize: getFontSize(13) }}
              >
                {healthCheckDate
                  ? format(healthCheckDate, "yyyy")
                  : "Select Year"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={scale(16)}
                color="#64748b"
              />
            </TouchableOpacity>
            {!isFormValid && (
              <Text
                className="text-red-500 font-pregular"
                style={{
                  fontSize: getFontSize(11),
                  marginTop: getSpacing(2),
                }}
              >
                Please select a year or toggle &quot;Never had a checkup&quot;
              </Text>
            )}
          </View>
        )}

        <YearPickerModal
          visible={showHealthYearPicker}
          currentYear={healthCheckDate?.getFullYear()}
          onClose={() => setShowHealthYearPicker(false)}
          onConfirm={handleYearChange}
          title="Last Health Checkup"
          subtitle="Select Year of"
          maxYear={new Date().getFullYear()}
          minYear={new Date().getFullYear() - 120}
        />

        {healthCheckDates.length === 0 && (
          <CustomButton
            title="Calculate Health Check Dates"
            handlePress={handleCalculateWithValidation}
            containerStyles={
              isFormValid ? "rounded-lg bg-secondary" : "rounded-lg bg-gray-300"
            }
            textStyles={
              isFormValid
                ? "font-pmedium text-sm text-center text-black"
                : "font-pmedium text-sm text-center text-gray-500"
            }
            isLoading={false}
          />
        )}

        {healthCheckDates.length > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginTop: getSpacing(12),
            }}
          >
            <View
              className="flex-row items-center"
              style={{ marginBottom: getSpacing(8) }}
            >
              <Ionicons name="fitness" size={scale(16)} color="#FF9C01" />
              <Text
                className="font-psemibold text-gray-800"
                style={{
                  fontSize: getFontSize(14),
                  marginLeft: scale(6),
                }}
              >
                Available Health Checks
              </Text>
            </View>

            <Text
              className="font-pregular text-gray-500"
              style={{
                fontSize: getFontSize(10),
                marginBottom: getSpacing(12),
              }}
            >
              Green items indicate recommended health checks. Orange items can
              be done with override. Tap to update results.
            </Text>

            <View>
              {healthCheckDates.map((check, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleCheckSelection(check)}
                  className={`rounded-lg border ${
                    check.eligible
                      ? "bg-green-50 border-green-100"
                      : "bg-orange-50 border-orange-100"
                  }`}
                  style={{
                    padding: scale(10),
                    marginBottom: getSpacing(8),
                  }}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="font-psemibold text-black"
                        style={{ fontSize: getFontSize(13) }}
                      >
                        {check.name}
                      </Text>

                      {getLastRecordedDate(check.name) && (
                        <View
                          className="flex-row items-center bg-gray-100 rounded-full self-start"
                          style={{
                            paddingHorizontal: scale(6),
                            paddingVertical: scale(2),
                            marginTop: getSpacing(2),
                            marginBottom: getSpacing(2),
                          }}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={scale(10)}
                            color="#22c55e"
                          />
                          <Text
                            className="font-pregular text-gray-600"
                            style={{
                              fontSize: getFontSize(9),
                              marginLeft: scale(2),
                            }}
                          >
                            Last: {getLastRecordedDate(check.name)}
                          </Text>
                        </View>
                      )}

                      <Text
                        className="font-pregular text-gray-500"
                        style={{ fontSize: getFontSize(10) }}
                      >
                        {check.eligible
                          ? `Every ${
                              check.interval === 0.5
                                ? "6 months"
                                : `${check.interval} years`
                            }`
                          : "Not recommended (can override)"}
                      </Text>
                    </View>

                    <View
                      className={`rounded-full items-center justify-center ${
                        check.eligible ? "bg-green-100" : "bg-orange-100"
                      }`}
                      style={{
                        width: scale(24),
                        height: scale(24),
                      }}
                    >
                      <Ionicons
                        name={check.eligible ? "chevron-forward" : "warning"}
                        size={scale(12)}
                        color={check.eligible ? "#22c55e" : "#f59e0b"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {totalHealthRecords > 0 && (
              <TouchableOpacity
                onPress={handleViewAllHistory}
                className="bg-gray-50 border border-gray-200 rounded-lg flex-row items-center justify-between"
                style={{
                  padding: scale(10),
                  marginTop: getSpacing(8),
                }}
                activeOpacity={0.7}
              >
                <View>
                  <Text
                    className="font-psemibold text-black"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    View All History
                  </Text>
                  <Text
                    className="font-pregular text-gray-600"
                    style={{ fontSize: getFontSize(11) }}
                  >
                    {totalHealthRecords} record
                    {totalHealthRecords !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View
                  className="rounded-full bg-secondary/20 items-center justify-center"
                  style={{
                    width: scale(24),
                    height: scale(24),
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={scale(12)}
                    color="#FF9C01"
                  />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>

      {/* History Viewer */}
      <HistoryViewer
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        screeningName={
          selectedCheckHistory === "All Health Checks"
            ? "Health Check"
            : selectedCheckHistory
        }
        history={
          selectedCheckHistory === "All Health Checks"
            ? history
            : history[selectedCheckHistory] || []
        }
        isFullHistory={selectedCheckHistory === "All Health Checks"}
      />

      {bookingCheck && (
        <ScreeningNextSteps
          item={{
            name: bookingCheck.name,
            date: bookingCheck.date,
          }}
          visible={showBookingModal}
          onBookingModalVisibilityChange={setShowBookingModal}
          onBookingStatusChange={(status, channel, details) =>
            onBookingStatusChange(
              bookingCheck.name,
              "health",
              status,
              channel,
              details,
            )
          }
          onMaybeLater={() => {
            if (bookingModalSource === "not_had") {
              onBookingDeferred?.(bookingCheck.name, "health");
            }
          }}
          onClose={() => {
            setShowBookingModal(false);
            setBookingCheck(null);
            setBookingModalSource(null);
          }}
          hideInlineCard
        />
      )}

      {/* Individual Health Check Forms */}
      <CardiovascularHealthForm
        visible={showCardiovascularForm}
        onClose={() => setShowCardiovascularForm(false)}
        onSubmit={handleCardiovascularSubmit}
        history={history}
      />

      <DiabetesCheckForm
        visible={showDiabetesForm}
        onClose={() => setShowDiabetesForm(false)}
        onSubmit={handleDiabetesSubmit}
        history={history}
      />

      <VisionCheckForm
        visible={showVisionForm}
        onClose={() => setShowVisionForm(false)}
        onSubmit={handleVisionSubmit}
        history={history}
      />

      <DentalCheckForm
        visible={showDentalForm}
        onClose={() => setShowDentalForm(false)}
        onSubmit={handleDentalSubmit}
        history={history}
      />

      <MentalHealthCheckForm
        visible={showMentalHealthForm}
        onClose={() => setShowMentalHealthForm(false)}
        onSubmit={handleMentalHealthSubmit}
        history={history}
      />

      {/* Eligibility Override Modal */}
      <Modal
        visible={showEligibilityModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl shadow-lg"
            style={{
              padding: scale(16),
              width: width * 0.9,
              maxWidth: 400,
            }}
          >
            <View
              className="flex-row justify-between items-center border-b border-gray-100"
              style={{
                marginBottom: getSpacing(12),
                paddingBottom: getSpacing(10),
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="rounded-full bg-orange-100 items-center justify-center"
                  style={{
                    width: scale(32),
                    height: scale(32),
                    marginRight: scale(10),
                  }}
                >
                  <Ionicons name="warning" size={scale(18)} color="#f59e0b" />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{
                    fontSize: getFontSize(16),
                    maxWidth: width * 0.6,
                  }}
                  numberOfLines={2}
                >
                  Not Recommended
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEligibilityModal(false)}
                className="rounded-full bg-gray-100 items-center justify-center"
                style={{
                  width: scale(28),
                  height: scale(28),
                }}
              >
                <Ionicons name="close" size={scale(16)} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text
              className="font-pregular text-gray-600"
              style={{
                fontSize: getFontSize(13),
                marginBottom: getSpacing(8),
              }}
            >
              <Text className="font-psemibold text-black">
                {selectedCheck?.name}
              </Text>{" "}
              is not typically recommended for your age group.
            </Text>

            <View
              className="bg-orange-50 rounded-lg border border-orange-100"
              style={{
                padding: scale(12),
                marginBottom: getSpacing(16),
              }}
            >
              <Text
                className="font-pregular text-orange-700"
                style={{ fontSize: getFontSize(12) }}
              >
                However, you can still proceed if you&apos;ve had this test done
                or your healthcare provider has recommended it specifically for
                you.
              </Text>
            </View>

            <View className="flex-row" style={{ gap: scale(8) }}>
              <TouchableOpacity
                onPress={() => handleEligibilityOverride(true)}
                className="flex-1 rounded-lg bg-secondary items-center justify-center"
                style={{
                  paddingVertical: getSpacing(10),
                  minHeight: scale(40),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={scale(16)}
                    color="#000"
                    style={{ marginRight: scale(6) }}
                  />
                  <Text
                    className="font-pmedium text-black"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    Continue
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleEligibilityOverride(false)}
                className="flex-1 rounded-lg bg-white border border-gray-200 items-center justify-center"
                style={{
                  paddingVertical: getSpacing(10),
                  minHeight: scale(40),
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="arrow-back"
                    size={scale(16)}
                    color="#000"
                    style={{ marginRight: scale(6) }}
                  />
                  <Text
                    className="font-pmedium text-black"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    Cancel
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* "Have you had this health check" Modal */}
      <Modal
        visible={showHadCheckModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl shadow-lg"
            style={{
              padding: scale(16),
              width: width * 0.9,
              maxWidth: 400,
            }}
          >
            <View
              className="flex-row justify-between items-center border-b border-gray-100"
              style={{
                marginBottom: getSpacing(12),
                paddingBottom: getSpacing(8),
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="rounded-full bg-secondary/20 items-center justify-center"
                  style={{
                    width: scale(32),
                    height: scale(32),
                    marginRight: scale(10),
                  }}
                >
                  <Ionicons name="fitness" size={scale(18)} color="#FF9C01" />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{
                    fontSize: getFontSize(16),
                    maxWidth: width * 0.6,
                  }}
                  numberOfLines={2}
                >
                  {selectedCheck?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHadCheckModal(false)}
                className="rounded-full bg-gray-100 items-center justify-center"
                style={{
                  width: scale(28),
                  height: scale(28),
                }}
              >
                <Ionicons name="close" size={scale(16)} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text
              className="font-pregular text-gray-600"
              style={{
                fontSize: getFontSize(13),
                marginBottom: getSpacing(16),
              }}
            >
              Have you had this health screening?
            </Text>

            <View className="flex-row" style={{ gap: scale(8) }}>
              <TouchableOpacity
                onPress={() => handleHadCheckResponse(true)}
                className="flex-1 rounded-lg bg-secondary items-center justify-center"
                style={{
                  paddingVertical: getSpacing(10),
                  minHeight: scale(40),
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={scale(16)}
                    color="#000"
                    style={{ marginRight: scale(6) }}
                  />
                  <Text
                    className="font-pmedium text-black"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    Yes
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleHadCheckResponse(false)}
                className="flex-1 rounded-lg bg-white border border-gray-200 items-center justify-center"
                style={{
                  paddingVertical: getSpacing(10),
                  minHeight: scale(40),
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="close-circle"
                    size={scale(16)}
                    color="#000"
                    style={{ marginRight: scale(6) }}
                  />
                  <Text
                    className="font-pmedium text-black"
                    style={{ fontSize: getFontSize(13) }}
                  >
                    No
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default HealthCheckForm;
