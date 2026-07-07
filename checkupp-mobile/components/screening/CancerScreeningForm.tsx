import React, { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
import { ScreeningItem } from "@/lib/utils/cancerScreeningChecks";
import { ScreeningHistory } from "@/lib/storage/screeningStorage";
import {
  BookingChannel,
  BookingStatus,
  BookingStatusDetails,
  ScreeningResultRecord,
} from "@/lib/screening/bookingFlow";
import { useToast } from "@/components/ToastProvider";
import {
  scale,
  getFontSize,
  getSpacing,
  screenDimensions,
  isSmallDevice,
} from "@/lib/utils/responsiveUtils";

const { width, height } = screenDimensions;

type CancerScreeningFormProps = {
  neverScreenedCancer: boolean;
  setNeverScreenedCancer: (value: boolean) => void;
  cancerScreeningDate: Date | undefined;
  setCancerScreeningDate: (date: Date | undefined) => void;
  cancerScreeningDates: ScreeningItem[];
  handleCalculateCancer: () => void;
  age: number | undefined;
  gender: Gender;
  onTestResultSubmit: (
    screeningName: string,
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
  testResults: Record<string, ScreeningResultRecord>;
  history?: ScreeningHistory;
};

const CancerScreeningForm = ({
  neverScreenedCancer,
  setNeverScreenedCancer,
  cancerScreeningDate,
  setCancerScreeningDate,
  cancerScreeningDates,
  handleCalculateCancer,
  age,
  gender,
  onTestResultSubmit,
  onBookingStatusChange,
  onBookingDeferred,
  testResults,
  history = {},
}: CancerScreeningFormProps) => {
  const [showCancerYearPicker, setShowCancerYearPicker] = useState(false);
  const [selectedScreening, setSelectedScreening] =
    useState<ScreeningItem | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showHadScreeningModal, setShowHadScreeningModal] = useState(false);
  const [wasResultNormal, setWasResultNormal] = useState<boolean | null>(null);
  const [testDate, setTestDate] = useState<string>("");
  const [testResultValue, setTestResultValue] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedScreeningHistory, setSelectedScreeningHistory] =
    useState<string>("");
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingModalSource, setBookingModalSource] = useState<
    "not_had" | "abnormal" | null
  >(null);
  const [bookingScreening, setBookingScreening] = useState<ScreeningItem | null>(
    null,
  );
  const { showToast } = useToast();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [cancerScreeningDates, fadeAnim]);

  const handleYearChange = (selectedYear: number) => {
    const updatedDate = new Date();
    updatedDate.setFullYear(selectedYear);
    updatedDate.setMonth(new Date().getMonth());
    updatedDate.setDate(new Date().getDate());
    setCancerScreeningDate(updatedDate);
    setShowCancerYearPicker(false);
  };

  const handleCalculateWithValidation = () => {
    if (!neverScreenedCancer && !cancerScreeningDate) {
      showToast(
        "Please either select 'Never had a screening' or choose your last cancer screening year.",
        "info",
      );
      return;
    }
    handleCalculateCancer();
  };

  const handleScreeningSelection = (screening: ScreeningItem) => {
    setSelectedScreening(screening);

    if (!screening.eligible) {
      setShowEligibilityModal(true);
    } else {
      setShowHadScreeningModal(true);
    }
  };

  const handleEligibilityOverride = (proceed: boolean) => {
    setShowEligibilityModal(false);
    if (proceed) {
      setShowHadScreeningModal(true);
    }
  };

  const handleViewAllHistory = () => {
    setSelectedScreeningHistory("All Cancer Screenings");
    setShowHistoryModal(true);
  };

  const scheduleAutomaticBookingReminder = (screening: ScreeningItem) => {
    void ensureAutomaticBookingReminder(screening.name).catch((error) => {
      console.error("Failed to schedule automatic booking reminder:", error);
      showToast("Unable to schedule booking reminder automatically", "error");
    });
  };

  const handleHadScreeningResponse = (hadScreening: boolean) => {
    setShowHadScreeningModal(false);
    if (!hadScreening) {
      if (selectedScreening) {
        setBookingScreening(selectedScreening);
        setBookingModalSource("not_had");
        setShowBookingModal(true);
        scheduleAutomaticBookingReminder(selectedScreening);
      }
      onTestResultSubmit(
        selectedScreening!.name,
        false,
        format(new Date(), "yyyy-MM-dd"),
      );
    } else {
      setShowResultModal(true);
      setWasResultNormal(null);
      setTestDate(format(new Date(), "yyyy-MM-dd"));
      setTestResultValue("");
    }
  };

  const handleSubmitResult = () => {
    if (selectedScreening && wasResultNormal !== null) {
      onTestResultSubmit(
        selectedScreening.name,
        wasResultNormal,
        testDate,
        testResultValue,
      );
      setShowResultModal(false);
      if (!wasResultNormal) {
        setBookingScreening(selectedScreening);
        setBookingModalSource("abnormal");
        setShowBookingModal(true);
        scheduleAutomaticBookingReminder(selectedScreening);
      }
    } else {
      showToast(
        "Please complete all required fields before submitting.",
        "error",
      );
    }
  };

  const getEligibilityReason = (screening: ScreeningItem | null) => {
    if (!screening) return "requirements";

    if (
      screening.name === "Cervical Cancer Screening" ||
      screening.name === "Breast Cancer Screening"
    ) {
      return "gender/age requirements";
    }
    return "age requirements";
  };

  const getTotalCancerRecords = () => {
    return Object.values(history).reduce(
      (total, records) => total + records.length,
      0,
    );
  };

  const totalCancerRecords = getTotalCancerRecords();
  const isFormValid = neverScreenedCancer || cancerScreeningDate;

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
            Cancer Screening History
          </Text>
          <Text
            className="font-pregular text-gray-600"
            style={{ fontSize: getFontSize(12) }}
          >
            Select your last cancer screening date or indicate if you&apos;ve
            never had a screening
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
            Never had a screening
          </Text>
          <Switch
            value={neverScreenedCancer}
            onValueChange={setNeverScreenedCancer}
            thumbColor={neverScreenedCancer ? "#FF9C01" : "#f4f4f5"}
            trackColor={{ true: "#FFEED9", false: "#e5e7eb" }}
            ios_backgroundColor="#e5e7eb"
            style={{
              transform: [{ scale: isSmallDevice ? 0.8 : 1 }],
            }}
          />
        </View>

        {!neverScreenedCancer && (
          <View style={{ marginBottom: getSpacing(16) }}>
            <Text
              className="font-pmedium text-gray-700"
              style={{
                fontSize: getFontSize(13),
                marginBottom: getSpacing(6),
              }}
            >
              Last Cancer Screening <Text className="text-red-500">*</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setShowCancerYearPicker(true)}
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
                {cancerScreeningDate
                  ? format(cancerScreeningDate, "yyyy")
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
                Please select a year or toggle &quot;Never had a screening&quot;
              </Text>
            )}
          </View>
        )}

        <YearPickerModal
          visible={showCancerYearPicker}
          currentYear={cancerScreeningDate?.getFullYear()}
          onClose={() => setShowCancerYearPicker(false)}
          onConfirm={handleYearChange}
          title="Last Cancer Screening"
          subtitle="Select Year of"
          maxYear={new Date().getFullYear()}
          minYear={new Date().getFullYear() - 120}
        />

        {cancerScreeningDates.length === 0 && (
          <CustomButton
            title="Calculate Cancer Screening Dates"
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

        {cancerScreeningDates.length > 0 && (
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
              <Ionicons name="medical" size={scale(16)} color="#FF9C01" />
              <Text
                className="font-psemibold text-gray-800"
                style={{
                  fontSize: getFontSize(14),
                  marginLeft: scale(6),
                }}
              >
                Available Cancer Screenings
              </Text>
            </View>

            <Text
              className="font-pregular text-gray-500"
              style={{
                fontSize: getFontSize(10),
                marginBottom: getSpacing(12),
              }}
            >
              Green items indicate recommended screenings. Orange items can be
              done with override. Tap to update results.
            </Text>

            <View>
              {cancerScreeningDates.map((screening, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleScreeningSelection(screening)}
                  className={`rounded-lg border ${
                    screening.eligible
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
                        {screening.name}
                      </Text>

                      {testResults[screening.name] && (
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
                            Last:{" "}
                            {format(
                              new Date(testResults[screening.name].date),
                              "yyyy-MM-dd",
                            )}
                          </Text>
                        </View>
                      )}

                      <Text
                        className="font-pregular text-gray-500"
                        style={{ fontSize: getFontSize(10) }}
                      >
                        {screening.eligible
                          ? `Every ${screening.interval} years`
                          : "Not recommended (can override)"}
                      </Text>
                    </View>

                    <View
                      className={`rounded-full items-center justify-center ${
                        screening.eligible ? "bg-green-100" : "bg-orange-100"
                      }`}
                      style={{
                        width: scale(24),
                        height: scale(24),
                      }}
                    >
                      <Ionicons
                        name={
                          screening.eligible ? "chevron-forward" : "warning"
                        }
                        size={scale(12)}
                        color={screening.eligible ? "#22c55e" : "#f59e0b"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {totalCancerRecords > 0 && (
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
                    {totalCancerRecords} record
                    {totalCancerRecords !== 1 ? "s" : ""}
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

      <HistoryViewer
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        screeningName={
          selectedScreeningHistory === "All Cancer Screenings"
            ? "Cancer Screening"
            : selectedScreeningHistory
        }
        history={
          selectedScreeningHistory === "All Cancer Screenings"
            ? history
            : history[selectedScreeningHistory] || []
        }
        isFullHistory={selectedScreeningHistory === "All Cancer Screenings"}
      />

      {bookingScreening && (
        <ScreeningNextSteps
          item={{
            name: bookingScreening.name,
            date: bookingScreening.date,
          }}
          visible={showBookingModal}
          onBookingModalVisibilityChange={setShowBookingModal}
          onBookingStatusChange={(status, channel, details) =>
            onBookingStatusChange(
              bookingScreening.name,
              "cancer",
              status,
              channel,
              details,
            )
          }
          onMaybeLater={() => {
            if (bookingModalSource === "not_had") {
              onBookingDeferred?.(bookingScreening.name, "cancer");
            }
          }}
          onClose={() => {
            setShowBookingModal(false);
            setBookingScreening(null);
            setBookingModalSource(null);
          }}
          hideInlineCard
        />
      )}

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
                {selectedScreening?.name || "This screening"}
              </Text>{" "}
              is not typically recommended for your{" "}
              {getEligibilityReason(selectedScreening)}.
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
                However, you can still proceed if you&apos;ve had this screening
                done or your healthcare provider has recommended it specifically
                for you.
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

      {/* Compact Modal for "Have you had this screening" */}
      <Modal
        visible={showHadScreeningModal}
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
                  <Ionicons name="medical" size={scale(18)} color="#FF9C01" />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{
                    fontSize: getFontSize(16),
                    maxWidth: width * 0.6,
                  }}
                  numberOfLines={2}
                >
                  {selectedScreening?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHadScreeningModal(false)}
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
              Have you had this screening test?
            </Text>

            <View className="flex-row" style={{ gap: scale(8) }}>
              <TouchableOpacity
                onPress={() => handleHadScreeningResponse(true)}
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
                onPress={() => handleHadScreeningResponse(false)}
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

      {/* Compact Modal for Test Result */}
      <Modal visible={showResultModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl shadow-lg"
            style={{
              padding: scale(16),
              width: width * 0.9,
              maxWidth: 400,
              maxHeight: height * 0.8,
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
                  <Ionicons
                    name="document-text"
                    size={scale(18)}
                    color="#FF9C01"
                  />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{
                    fontSize: getFontSize(16),
                    maxWidth: width * 0.6,
                  }}
                  numberOfLines={2}
                >
                  Screening Result
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowResultModal(false)}
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
                className="font-pregular text-gray-600"
                style={{
                  fontSize: getFontSize(13),
                  marginBottom: getSpacing(12),
                }}
              >
                Was the result normal?
              </Text>

              <View
                className="flex-row"
                style={{ marginBottom: getSpacing(16), gap: scale(8) }}
              >
                <TouchableOpacity
                  onPress={() => setWasResultNormal(true)}
                  className={`flex-1 rounded-lg ${
                    wasResultNormal === true
                      ? "bg-secondary"
                      : "bg-white border border-gray-200"
                  } items-center justify-center`}
                  style={{
                    paddingVertical: getSpacing(10),
                    minHeight: scale(40),
                    shadowColor:
                      wasResultNormal === true ? "#000" : "transparent",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: wasResultNormal === true ? 2 : 0,
                  }}
                >
                  <View className="flex-row items-center">
                    {wasResultNormal === true && (
                      <Ionicons
                        name="checkmark-circle"
                        size={scale(14)}
                        color="#000"
                        style={{ marginRight: scale(4) }}
                      />
                    )}
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      Normal
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setWasResultNormal(false)}
                  className={`flex-1 rounded-lg ${
                    wasResultNormal === false
                      ? "bg-secondary/40"
                      : "bg-gray-100"
                  } items-center justify-center`}
                  style={{
                    paddingVertical: getSpacing(10),
                    marginLeft: scale(6),
                  }}
                >
                  <View className="flex-row items-center">
                    {wasResultNormal === false && (
                      <Ionicons
                        name="alert-circle"
                        size={scale(14)}
                        color="#000"
                        style={{ marginRight: scale(4) }}
                      />
                    )}
                    <Text
                      className="font-pmedium text-gray-900"
                      style={{ fontSize: getFontSize(12) }}
                    >
                      Abnormal
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {wasResultNormal !== null && (
                <>
                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(12),
                      marginBottom: getSpacing(6),
                    }}
                  >
                    Date of Screening
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="border border-gray-200 rounded-lg bg-gray-50 flex-row justify-between items-center"
                    style={{
                      paddingHorizontal: scale(12),
                      paddingVertical: getSpacing(10),
                      marginBottom: getSpacing(12),
                    }}
                  >
                    <Text
                      className="font-pregular text-gray-900"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      {testDate || "Select Date"}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={scale(16)}
                      color="#64748b"
                    />
                  </TouchableOpacity>

                  <YearPickerModal
                    visible={showDatePicker}
                    currentYear={
                      testDate ? parseInt(testDate.split("-")[0]) : undefined
                    }
                    onClose={() => setShowDatePicker(false)}
                    onConfirm={(year) => {
                      setTestDate(
                        `${year}-${
                          new Date().getMonth() + 1
                        }-${new Date().getDate()}`,
                      );
                      setShowDatePicker(false);
                    }}
                    title="Date of Screening"
                    subtitle="Select Year of"
                    maxYear={new Date().getFullYear()}
                    minYear={new Date().getFullYear() - 10}
                  />

                  <Text
                    className="font-pmedium text-black"
                    style={{
                      fontSize: getFontSize(12),
                      marginBottom: getSpacing(6),
                    }}
                  >
                    Test Result
                  </Text>
                  <TextInput
                    value={testResultValue}
                    onChangeText={setTestResultValue}
                    placeholder="Enter test result"
                    placeholderTextColor="#9ca3af"
                    className="border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
                    style={{
                      paddingHorizontal: scale(12),
                      paddingVertical: getSpacing(10),
                      fontSize: getFontSize(13),
                      marginBottom: getSpacing(12),
                    }}
                  />
                </>
              )}

              <CustomButton
                title="Submit"
                handlePress={handleSubmitResult}
                containerStyles={`rounded-lg ${
                  wasResultNormal !== null ? "bg-secondary" : "bg-gray-300"
                }`}
                textStyles={`${
                  wasResultNormal !== null ? "text-black" : "text-gray-500"
                } font-pmedium text-center`}
                isLoading={false}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CancerScreeningForm;
