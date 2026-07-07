import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Linking,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PhoneInput from "@/components/PhonenumberInput";
import UnifiedDatePicker from "@/components/screening/UnifiedDatePicker";
import UnifiedTimePicker from "@/components/screening/UnifiedTimePicker";
import {
  loadReminders,
  saveReminders,
  type Reminder,
} from "@/lib/notifications/reminders";
import scheduleNotifications from "@/lib/notifications/scheduleNotifications";
import { useToast } from "@/components/ToastProvider";
import { getFontSize, getSpacing, scale } from "@/lib/utils/responsiveUtils";
import {
  BookingChannel,
  ScreeningResultRecord,
  BookingStatus,
  BookingStatusDetails,
} from "@/lib/screening/bookingFlow";
import { usePracticeContact } from "@/lib/features/practice-contacts/queries";
import { useSavePracticeContactMutation } from "@/lib/features/practice-contacts/mutations";

type NextStepItem = {
  name: string;
  date: string;
};

type PracticeContact = {
  hotdocUrl: string;
  practicePhone: string;
  practiceEmail: string;
};

type ContactTouchedState = {
  hotdocUrl: boolean;
  practicePhone: boolean;
  practiceEmail: boolean;
};

type ScreeningNextStepsProps = {
  item: NextStepItem;
  record?: ScreeningResultRecord;
  visible?: boolean;
  onBookingModalVisibilityChange?: (visible: boolean) => void;
  onClose?: () => void;
  onMaybeLater?: () => void;
  hideInlineCard?: boolean;
  onBookingStatusChange?: (
    status: BookingStatus,
    channel?: BookingChannel,
    details?: BookingStatusDetails,
  ) => void;
};

type BookingMethodOption = {
  value: BookingChannel;
  label: string;
  helper: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const defaultHotdocUrl =
  process.env.EXPO_PUBLIC_DEFAULT_HOTDOC_URL?.trim() ||
  "https://www.hotdoc.com.au/";

const defaultContact: PracticeContact = {
  hotdocUrl: defaultHotdocUrl,
  practicePhone: "",
  practiceEmail: "",
};

const defaultTouchedState: ContactTouchedState = {
  hotdocUrl: false,
  practicePhone: false,
  practiceEmail: false,
};

const bookingMethodOptions: BookingMethodOption[] = [
  {
    value: "hotdoc",
    label: "HotDoc",
    helper: "Open a booking link for this screening.",
    icon: "globe-outline",
  },
  {
    value: "phone",
    label: "Phone",
    helper: "Call the practice directly to book.",
    icon: "call-outline",
  },
  {
    value: "email",
    label: "Email",
    helper: "Send an appointment request by email.",
    icon: "mail-outline",
  },
];

const getReminderDate = () => {
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + 1);
  reminderDate.setHours(9, 0, 0, 0);
  return reminderDate;
};

const sanitizePhoneNumber = (value: string) => value.replace(/\s+/g, "");
const normalizeUrl = (value: string) =>
  /^https?:\/\//i.test(value) ? value : `https://${value}`;
const isLikelyValidUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(normalizeUrl(trimmed));
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
};
const isLikelyValidPhone = (value: string) => {
  const sanitized = sanitizePhoneNumber(value.trim());
  return /^\+?[0-9]{6,15}$/.test(sanitized);
};
const isLikelyValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isLikelyValidTime = (value: string) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(value.trim());
const sanitizeStorageKey = (value: string) =>
  value.trim().replace(/[^A-Za-z0-9._-]/g, "_");

export const ensureAutomaticBookingReminder = async (itemName: string) => {
  const reminderTitle = `Book ${itemName}`;
  const reminders = await loadReminders();
  const existingReminder = reminders.find(
    (reminder) => reminder.type === reminderTitle,
  );

  if (existingReminder) {
    return existingReminder;
  }

  const reminderDate = getReminderDate();
  const reminder: Reminder = {
    id: Date.now().toString(),
    type: reminderTitle,
    dueDate: reminderDate.toISOString(),
  };

  await saveReminders([...reminders, reminder]);
  await scheduleNotifications([
    {
      date: reminderDate.toISOString(),
      title: reminderTitle,
      body: `Reminder to book ${itemName}.`,
    },
  ]);

  return reminder;
};

const ScreeningNextSteps = ({
  item,
  record,
  visible,
  onBookingModalVisibilityChange,
  onClose,
  onMaybeLater,
  hideInlineCard = false,
  onBookingStatusChange,
}: ScreeningNextStepsProps) => {
  const { showToast } = useToast();
  const [internalShowBookingModal, setInternalShowBookingModal] =
    useState(false);
  const [contact, setContact] = useState<PracticeContact>(defaultContact);
  const [touched, setTouched] =
    useState<ContactTouchedState>(defaultTouchedState);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentModalSource, setAppointmentModalSource] = useState<
    "booking" | "confirm" | "direct"
  >("direct");
  const [selectedBookingMethod, setSelectedBookingMethod] =
    useState<BookingChannel>("hotdoc");
  const [activeBookingMethod, setActiveBookingMethod] =
    useState<BookingChannel>("hotdoc");
  const [appointmentDate, setAppointmentDate] = useState(() => new Date());
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentProvider, setAppointmentProvider] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [appointmentTimeTouched, setAppointmentTimeTouched] = useState(false);

  const defaultPracticeContactKey = "screening_practice_contact.default";
  const practiceContactKey = useMemo(
    () => `screening_practice_contact.${sanitizeStorageKey(item.name)}`,
    [item.name],
  );
  const storageKeys = useMemo(
    () => ({
      defaultKey: defaultPracticeContactKey,
      screeningKey: practiceContactKey,
    }),
    [defaultPracticeContactKey, practiceContactKey],
  );

  const dueSummary = useMemo(() => item.name, [item.name]);
  const isBookingModalVisible = visible ?? internalShowBookingModal;
  const { data: savedContact } = usePracticeContact({
    screeningName: item.name,
    storageKeys,
    defaultHotdocUrl,
  });
  const savePracticeContact = useSavePracticeContactMutation();
  const trimmedHotdocUrl = contact.hotdocUrl.trim();
  const trimmedPracticePhone = contact.practicePhone.trim();
  const trimmedPracticeEmail = contact.practiceEmail.trim();
  const canOpenHotdoc = isLikelyValidUrl(trimmedHotdocUrl);
  const canCallPractice = isLikelyValidPhone(trimmedPracticePhone);
  const canEmailPractice = isLikelyValidEmail(trimmedPracticeEmail);
  const appointmentTimeError = appointmentTimeTouched
    ? appointmentTime.trim()
      ? isLikelyValidTime(appointmentTime)
        ? ""
        : "Enter time in 24-hour format, for example 09:30."
      : "Add the appointment time."
    : "";
  const hotdocError = touched.hotdocUrl
    ? trimmedHotdocUrl
      ? canOpenHotdoc
        ? ""
        : "Enter a valid booking link."
      : "Add a booking link to use online booking."
    : "";
  const phoneError = touched.practicePhone
    ? trimmedPracticePhone
      ? canCallPractice
        ? ""
        : "Enter a valid phone number."
      : "Add a phone number to call the practice."
    : "";
  const emailError = touched.practiceEmail
    ? trimmedPracticeEmail
      ? canEmailPractice
        ? ""
        : "Enter a valid email address."
      : "Add an email address to use email booking."
    : "";
  const selectedMethodOption =
    bookingMethodOptions.find(
      (option) => option.value === selectedBookingMethod,
    ) || bookingMethodOptions[0];
  const selectedBookingActionLabel =
    selectedBookingMethod === "hotdoc"
      ? "Open booking link"
      : selectedBookingMethod === "phone"
        ? "Call practice"
        : "Email practice";
  const selectedBookingFieldLabel =
    selectedBookingMethod === "hotdoc"
      ? "booking link"
      : selectedBookingMethod === "phone"
        ? "phone number"
        : "email address";
  const currentBookingStatus = record?.bookingStatus || null;
  const canUseSelectedMethod =
    selectedBookingMethod === "hotdoc"
      ? canOpenHotdoc
      : selectedBookingMethod === "phone"
        ? canCallPractice
        : canEmailPractice;
  const canSaveSelectedMethod =
    selectedBookingMethod === "hotdoc"
      ? Boolean(trimmedHotdocUrl) && canOpenHotdoc
      : selectedBookingMethod === "phone"
        ? Boolean(trimmedPracticePhone) && canCallPractice
        : Boolean(trimmedPracticeEmail) && canEmailPractice;

  const resolveDefaultBookingMethod = useCallback((): BookingChannel => {
    if (record?.bookingChannel) return record.bookingChannel;
    if (canOpenHotdoc) return "hotdoc";
    if (canCallPractice) return "phone";
    if (canEmailPractice) return "email";
    if (trimmedHotdocUrl) return "hotdoc";
    if (trimmedPracticePhone) return "phone";
    if (trimmedPracticeEmail) return "email";
    return "hotdoc";
  }, [
    canCallPractice,
    canEmailPractice,
    canOpenHotdoc,
    record?.bookingChannel,
    trimmedHotdocUrl,
    trimmedPracticeEmail,
    trimmedPracticePhone,
  ]);

  const hydrateAppointmentFields = useCallback(
    (method?: BookingChannel) => {
      const nextMethod = method || resolveDefaultBookingMethod();
      setActiveBookingMethod(nextMethod);
      setSelectedBookingMethod(nextMethod);
      setAppointmentTime(
        record?.appointmentAt
          ? new Date(record.appointmentAt).toISOString().slice(11, 16)
          : "",
      );
      setAppointmentProvider(record?.providerName || "");
      setAppointmentNotes(record?.notes || "");
      setAppointmentDate(
        record?.appointmentAt ? new Date(record.appointmentAt) : new Date(),
      );
      setAppointmentTimeTouched(false);
    },
    [
      record?.appointmentAt,
      record?.notes,
      record?.providerName,
      resolveDefaultBookingMethod,
    ],
  );

  const openAppointmentDetailsDialog = useCallback(
    (
      method?: BookingChannel,
      source: "booking" | "confirm" | "direct" = "direct",
    ) => {
      const nextMethod = method || resolveDefaultBookingMethod();
      hydrateAppointmentFields(nextMethod);
      setAppointmentModalSource(source);
      setShowAppointmentModal(true);
    },
    [hydrateAppointmentFields, resolveDefaultBookingMethod],
  );

  const openBookingModal = useCallback(() => {
    const nextMethod = resolveDefaultBookingMethod();
    setSelectedBookingMethod(nextMethod);
    setTouched(defaultTouchedState);
    if (typeof visible === "boolean") {
      onBookingModalVisibilityChange?.(true);
      return;
    }
    setInternalShowBookingModal(true);
  }, [onBookingModalVisibilityChange, resolveDefaultBookingMethod, visible]);

  const closeBookingModal = useCallback(() => {
    setTouched(defaultTouchedState);
    if (typeof visible === "boolean") {
      onBookingModalVisibilityChange?.(false);
      return;
    }
    setInternalShowBookingModal(false);
  }, [onBookingModalVisibilityChange, visible]);

  const closeBookingFlow = useCallback(() => {
    setTouched(defaultTouchedState);
    setShowConfirmModal(false);
    setShowAppointmentModal(false);
    setAppointmentTime("");
    setAppointmentProvider("");
    setAppointmentNotes("");
    setAppointmentTimeTouched(false);
    setAppointmentDate(new Date());
    setAppointmentModalSource("direct");

    if (typeof visible === "boolean") {
      onBookingModalVisibilityChange?.(false);
      onClose?.();
      return;
    }

    setInternalShowBookingModal(false);
  }, [onBookingModalVisibilityChange, onClose, visible]);

  useEffect(() => {
    if (!savedContact) return;
    setContact(savedContact);
  }, [savedContact]);

  const updateContactField = useCallback(
    (field: keyof PracticeContact, value: string) => {
      setContact((prev) => ({ ...prev, [field]: value }));
      setTouched((prev) => ({ ...prev, [field]: true }));
    },
    [],
  );

  const markFieldTouched = useCallback((field: keyof ContactTouchedState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const markMethodFieldTouched = useCallback(
    (method: BookingChannel) => {
      if (method === "hotdoc") markFieldTouched("hotdocUrl");
      if (method === "phone") markFieldTouched("practicePhone");
      if (method === "email") markFieldTouched("practiceEmail");
    },
    [markFieldTouched],
  );

  const closeConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
    setShowAppointmentModal(false);
    setAppointmentTime("");
    setAppointmentProvider("");
    setAppointmentNotes("");
    setAppointmentTimeTouched(false);
    setAppointmentDate(new Date());
    setAppointmentModalSource("direct");
    setActiveBookingMethod(resolveDefaultBookingMethod());
  }, [resolveDefaultBookingMethod]);

  const handleAppointmentBack = useCallback(() => {
    setShowAppointmentModal(false);
    setAppointmentTimeTouched(false);

    if (appointmentModalSource === "confirm") {
      setShowConfirmModal(true);
      return;
    }

    if (appointmentModalSource === "booking") {
      if (typeof visible === "boolean") {
        onBookingModalVisibilityChange?.(true);
        return;
      }
      setInternalShowBookingModal(true);
      return;
    }

    closeConfirmModal();
  }, [
    appointmentModalSource,
    closeConfirmModal,
    onBookingModalVisibilityChange,
    visible,
  ]);

  const saveContact = useCallback(async () => {
    if (!canSaveSelectedMethod) {
      markMethodFieldTouched(selectedBookingMethod);
      showToast(`Add a valid ${selectedBookingFieldLabel} to save`, "error");
      return;
    }
    setIsSavingContact(true);
    try {
      await savePracticeContact.mutateAsync({
        screeningName: item.name,
        contact,
        storageKeys,
        defaultHotdocUrl,
      });
      closeBookingFlow();
    } catch (error) {
      console.error("Failed to save practice contact:", error);
      showToast("Unable to save practice contact", "error");
    } finally {
      setIsSavingContact(false);
    }
  }, [
    canSaveSelectedMethod,
    closeBookingFlow,
    contact,
    item.name,
    markMethodFieldTouched,
    savePracticeContact,
    selectedBookingFieldLabel,
    selectedBookingMethod,
    showToast,
    storageKeys,
  ]);

  const openBookingLink = useCallback(
    async (target: "hotdoc" | "phone" | "email") => {
      if (target === "hotdoc" && !canOpenHotdoc) {
        markFieldTouched("hotdocUrl");
        return;
      }

      if (target === "phone" && !canCallPractice) {
        markFieldTouched("practicePhone");
        return;
      }

      if (target === "email" && !canEmailPractice) {
        markFieldTouched("practiceEmail");
        return;
      }

      try {
        let url = "";

        if (target === "hotdoc") {
          url = normalizeUrl(trimmedHotdocUrl);
        }

        if (target === "phone") {
          const phone = sanitizePhoneNumber(trimmedPracticePhone);
          url = `tel:${phone}`;
        }

        if (target === "email") {
          const email = trimmedPracticeEmail;
          const subject = encodeURIComponent("Appointment booking request");
          const body = encodeURIComponent(
            `Hello,\n\nI would like to book an appointment for ${dueSummary}.\n\nThank you.`,
          );
          url = `mailto:${email}?subject=${subject}&body=${body}`;
        }

        await Linking.openURL(url);
        setActiveBookingMethod(target);
        onBookingStatusChange?.("started", target);
        setShowConfirmModal(true);
        closeBookingModal();
      } catch (error) {
        console.error("Failed to open booking action:", error);
        showToast("Unable to open that booking option", "error");
      }
    },
    [
      canCallPractice,
      canEmailPractice,
      canOpenHotdoc,
      closeBookingModal,
      dueSummary,
      markFieldTouched,
      onBookingStatusChange,
      showToast,
      trimmedHotdocUrl,
      trimmedPracticeEmail,
      trimmedPracticePhone,
    ],
  );

  const openSelectedBookingMethod = useCallback(() => {
    if (!canUseSelectedMethod) {
      markMethodFieldTouched(selectedBookingMethod);
      return;
    }

    void openBookingLink(selectedBookingMethod);
  }, [
    canUseSelectedMethod,
    markMethodFieldTouched,
    openBookingLink,
    selectedBookingMethod,
  ]);

  const submitBookedAppointment = useCallback(() => {
    if (!appointmentTime.trim() || !isLikelyValidTime(appointmentTime)) {
      setAppointmentTimeTouched(true);
      return;
    }

    const [hours, minutes] = appointmentTime.trim().split(":").map(Number);
    const scheduledAt = new Date(appointmentDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    onBookingStatusChange?.("confirmed", activeBookingMethod, {
      appointmentAt: scheduledAt.toISOString(),
      bookedAt: new Date().toISOString(),
      providerName: appointmentProvider.trim() || undefined,
      notes: appointmentNotes.trim() || undefined,
    });
    closeBookingFlow();
  }, [
    activeBookingMethod,
    appointmentDate,
    appointmentNotes,
    appointmentProvider,
    appointmentTime,
    closeBookingFlow,
    onBookingStatusChange,
  ]);

  return (
    <>
      {!hideInlineCard && (
        <View
          style={{
            padding: scale(10),
            marginTop: getSpacing(8),
            borderRadius: scale(10),
            borderWidth: 1,
            borderColor:
              currentBookingStatus === "confirmed" ? "#BBF7D0" : "#FECBA1",
            backgroundColor:
              currentBookingStatus === "confirmed" ? "#F0FDF4" : "#FFF5E6",
          }}
        >
          <View
            className="flex-row items-center"
            style={{ marginBottom: getSpacing(4) }}
          >
            <Ionicons
              name={
                currentBookingStatus === "confirmed"
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={scale(14)}
              color={
                currentBookingStatus === "confirmed" ? "#16A34A" : "#EA580C"
              }
              style={{ marginRight: scale(6) }}
            />
            <Text
              className="font-psemibold"
              style={{
                fontSize: getFontSize(12),
                color:
                  currentBookingStatus === "confirmed" ? "#14532D" : "#7C2D12",
              }}
            >
              {currentBookingStatus === "confirmed"
                ? "Appointment booked"
                : "Booking required"}
            </Text>
          </View>

          <Text
            style={{
              fontSize: getFontSize(10),
              marginBottom: getSpacing(10),
              lineHeight: getFontSize(15),
              color:
                currentBookingStatus === "confirmed" ? "#166534" : "#9A3412",
            }}
            className="font-pregular"
          >
            {currentBookingStatus === "confirmed"
              ? record?.appointmentAt
                ? `${dueSummary} is booked for ${new Date(record.appointmentAt).toLocaleString()}.`
                : `${dueSummary} has a recorded appointment.`
              : `${dueSummary} needs appointment follow-up.`}
          </Text>

          {currentBookingStatus === "confirmed" ? (
            <TouchableOpacity
              onPress={() =>
                openAppointmentDetailsDialog(record?.bookingChannel)
              }
              className="flex-row items-center justify-center self-start rounded-lg"
              style={{
                paddingVertical: getSpacing(7),
                paddingHorizontal: scale(12),
                borderWidth: 1,
                borderColor: "#16A34A",
                backgroundColor: "transparent",
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="create-outline"
                size={scale(13)}
                color="#16A34A"
                style={{ marginRight: scale(6) }}
              />
              <Text
                className="font-psemibold"
                style={{ fontSize: getFontSize(11), color: "#16A34A" }}
              >
                Edit Appointment
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={openBookingModal}
              className="flex-row items-center justify-center self-start rounded-lg"
              style={{
                paddingVertical: getSpacing(7),
                paddingHorizontal: scale(12),
                backgroundColor: "#FF9C01",
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="open-outline"
                size={scale(13)}
                color="#FFFFFF"
                style={{ marginRight: scale(6) }}
              />
              <Text
                className="font-psemibold text-white"
                style={{ fontSize: getFontSize(11) }}
              >
                Book Appointment
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={isBookingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeBookingFlow}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl"
            style={{
              width: "88%",
              maxWidth: 380,
              maxHeight: "82%",
              padding: scale(16),
            }}
          >
            <Text
              className="font-psemibold text-gray-900"
              style={{ fontSize: getFontSize(15), marginBottom: getSpacing(6) }}
            >
              Book appointment
            </Text>
            <Text
              className="font-pregular text-gray-600"
              style={{
                fontSize: getFontSize(11),
                marginBottom: getSpacing(14),
                lineHeight: getFontSize(16),
              }}
            >
              {`Choose how to book ${item.name.toLowerCase()}, save the contact for this method, or record details if you already booked it elsewhere.`}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: getSpacing(2) }}
            >
              <View style={{ marginBottom: getSpacing(12) }}>
                <Text
                  className="font-pmedium text-gray-700"
                  style={{
                    fontSize: getFontSize(11),
                    marginBottom: getSpacing(6),
                  }}
                >
                  Booking method
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: scale(8) }}>
                  {bookingMethodOptions.map((option) => {
                    const isSelected = option.value === selectedBookingMethod;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setSelectedBookingMethod(option.value);
                        }}
                        className={`rounded-lg border ${
                          isSelected
                            ? "border-orange-300 bg-orange-50"
                            : "border-gray-200 bg-white"
                        }`}
                        style={{
                          flexBasis: "31%",
                          paddingVertical: getSpacing(8),
                          paddingHorizontal: scale(8),
                        }}
                        activeOpacity={0.85}
                      >
                        <View className="items-center">
                          <Ionicons
                            name={option.icon}
                            size={scale(14)}
                            color={isSelected ? "#ea580c" : "#64748b"}
                            style={{ marginBottom: getSpacing(4) }}
                          />
                          <Text
                            className={`font-pmedium ${
                              isSelected ? "text-orange-700" : "text-gray-700"
                            }`}
                            style={{ fontSize: getFontSize(10) }}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text
                  className="font-pregular text-gray-500"
                  style={{
                    fontSize: getFontSize(9),
                    marginTop: getSpacing(6),
                    lineHeight: getFontSize(13),
                  }}
                >
                  {selectedMethodOption.helper}
                </Text>
              </View>

              <View style={{ gap: scale(10), marginBottom: getSpacing(12) }}>
                {selectedBookingMethod === "hotdoc" && (
                  <View>
                    <Text
                      className="font-pmedium text-gray-700"
                      style={{
                        fontSize: getFontSize(11),
                        marginBottom: getSpacing(4),
                      }}
                    >
                      HotDoc or booking URL
                    </Text>
                    <View
                      className={`rounded-lg bg-gray-50 border flex-row items-center ${
                        hotdocError ? "border-red-300" : "border-gray-200"
                      }`}
                      style={{
                        paddingLeft: scale(12),
                        paddingRight: scale(12),
                      }}
                    >
                      <TextInput
                        value={contact.hotdocUrl}
                        onChangeText={(value: string) =>
                          updateContactField("hotdocUrl", value)
                        }
                        placeholder="https://www.hotdoc.com.au/..."
                        placeholderTextColor="#9CA3AF"
                        autoCapitalize="none"
                        className="text-gray-900 flex-1"
                        style={{
                          paddingVertical: getSpacing(10),
                          fontSize: getFontSize(12),
                        }}
                      />
                    </View>
                    <Text
                      className={hotdocError ? "text-red-500" : "text-gray-500"}
                      style={{
                        fontSize: getFontSize(9),
                        marginTop: getSpacing(3),
                      }}
                    >
                      {hotdocError ||
                        "The default booking link is prefilled and can be replaced if this screening uses another clinic."}
                    </Text>
                  </View>
                )}

                {selectedBookingMethod === "phone" && (
                  <View>
                    <PhoneInput
                      label="Practice phone"
                      value={contact.practicePhone}
                      onChangeText={(value) =>
                        updateContactField("practicePhone", value)
                      }
                      placeholder="Enter practice phone number"
                    />
                    <Text
                      className={phoneError ? "text-red-500" : "text-gray-500"}
                      style={{
                        fontSize: getFontSize(9),
                        marginTop: -getSpacing(2),
                        marginBottom: getSpacing(2),
                      }}
                    >
                      {phoneError ||
                        "Use the practice number you want the patient to call."}
                    </Text>
                  </View>
                )}

                {selectedBookingMethod === "email" && (
                  <View>
                    <Text
                      className="font-pmedium text-gray-700"
                      style={{
                        fontSize: getFontSize(11),
                        marginBottom: getSpacing(4),
                      }}
                    >
                      Practice email
                    </Text>
                    <View
                      className={`rounded-lg bg-gray-50 border flex-row items-center ${
                        emailError ? "border-red-300" : "border-gray-200"
                      }`}
                      style={{
                        paddingLeft: scale(12),
                        paddingRight: scale(12),
                      }}
                    >
                      <TextInput
                        value={contact.practiceEmail}
                        onChangeText={(value: string) =>
                          updateContactField("practiceEmail", value)
                        }
                        placeholder="reception@practice.com"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="text-gray-900 flex-1"
                        style={{
                          paddingVertical: getSpacing(10),
                          fontSize: getFontSize(12),
                        }}
                      />
                    </View>
                    <Text
                      className={emailError ? "text-red-500" : "text-gray-500"}
                      style={{
                        fontSize: getFontSize(9),
                        marginTop: getSpacing(3),
                      }}
                    >
                      {emailError ||
                        "Add the practice inbox for email booking requests."}
                    </Text>
                  </View>
                )}
              </View>

              <View
                className="flex-row"
                style={{ gap: scale(8), marginBottom: getSpacing(14) }}
              >
                <TouchableOpacity
                  onPress={openSelectedBookingMethod}
                  className="flex-1 rounded-lg bg-secondary items-center justify-center"
                  style={{ paddingVertical: getSpacing(10) }}
                  activeOpacity={0.85}
                >
                  <Text
                    className="font-pmedium text-black"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    {selectedBookingActionLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveContact}
                  className="flex-1 rounded-lg border border-gray-200 bg-white items-center justify-center"
                  style={{
                    paddingVertical: getSpacing(10),
                    opacity: isSavingContact ? 0.6 : 1,
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    className="font-pmedium text-gray-700"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    {isSavingContact ? "Saving..." : "Save Contact"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                className="rounded-xl border border-gray-200 bg-gray-50"
                style={{
                  padding: scale(12),
                  marginBottom: getSpacing(12),
                }}
              >
                <Text
                  className="font-psemibold text-gray-900"
                  style={{
                    fontSize: getFontSize(12),
                    marginBottom: getSpacing(4),
                  }}
                >
                  Already booked elsewhere?
                </Text>
                <Text
                  className="font-pregular text-gray-600"
                  style={{
                    fontSize: getFontSize(10),
                    lineHeight: getFontSize(15),
                    marginBottom: getSpacing(10),
                  }}
                >
                  Record the booked date and time using the same appointment
                  details form.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    closeBookingModal();
                    openAppointmentDetailsDialog(
                      selectedBookingMethod,
                      "booking",
                    );
                  }}
                  className="rounded-lg border border-gray-200 bg-white items-center justify-center"
                  style={{ paddingVertical: getSpacing(10) }}
                  activeOpacity={0.85}
                >
                  <Text
                    className="font-pmedium text-gray-700"
                    style={{ fontSize: getFontSize(12) }}
                  >
                    Provide Appointment Details
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  onMaybeLater?.();
                  closeBookingFlow();
                }}
                className="rounded-lg bg-gray-100 items-center justify-center"
                style={{ paddingVertical: getSpacing(10) }}
                activeOpacity={0.85}
              >
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(12) }}
                >
                  Maybe later
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmModal}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl"
            style={{
              width: "88%",
              maxWidth: 380,
              padding: scale(16),
            }}
          >
            <Text
              className="font-psemibold text-gray-900"
              style={{ fontSize: getFontSize(15), marginBottom: getSpacing(6) }}
            >
              Did you book this appointment?
            </Text>
            <Text
              className="font-pregular text-gray-600"
              style={{
                fontSize: getFontSize(11),
                marginBottom: getSpacing(14),
                lineHeight: getFontSize(16),
              }}
            >
              {`Confirm whether ${item.name.toLowerCase()} has been booked so we can update this schedule item correctly.`}
            </Text>
            <View className="flex-row" style={{ gap: scale(8) }}>
              <TouchableOpacity
                onPress={() => {
                  setShowConfirmModal(false);
                  openAppointmentDetailsDialog(activeBookingMethod, "confirm");
                }}
                className="flex-1 rounded-lg bg-secondary items-center justify-center"
                style={{ paddingVertical: getSpacing(10) }}
              >
                <Text
                  className="font-pmedium text-black"
                  style={{ fontSize: getFontSize(12) }}
                >
                  Yes, booked
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onBookingStatusChange?.("required");
                  closeBookingFlow();
                }}
                className="flex-1 rounded-lg bg-gray-100 items-center justify-center"
                style={{ paddingVertical: getSpacing(10) }}
              >
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(12) }}
                >
                  Not yet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAppointmentModal}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmModal}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View
            className="bg-white rounded-xl"
            style={{
              width: "88%",
              maxWidth: 380,
              padding: scale(16),
            }}
          >
            <Text
              className="font-psemibold text-gray-900"
              style={{ fontSize: getFontSize(15), marginBottom: getSpacing(6) }}
            >
              Appointment details
            </Text>
            <Text
              className="font-pregular text-gray-600"
              style={{
                fontSize: getFontSize(11),
                marginBottom: getSpacing(14),
                lineHeight: getFontSize(16),
              }}
            >
              {`Add the appointment date and time for ${item.name.toLowerCase()}.`}
            </Text>

            <UnifiedDatePicker
              label="Appointment date"
              value={appointmentDate}
              onChange={setAppointmentDate}
              required
              maxDate={new Date(2100, 11, 31)}
              minDate={new Date()}
            />
            <UnifiedTimePicker
              label="Appointment time"
              value={appointmentTime}
              onChange={(value) => {
                setAppointmentTime(value);
                setAppointmentTimeTouched(true);
              }}
              required
              error={appointmentTimeError}
            />
            <View style={{ marginTop: getSpacing(10) }}>
              <Text
                className="font-pmedium text-gray-700"
                style={{
                  fontSize: getFontSize(11),
                  marginBottom: getSpacing(4),
                }}
              >
                Clinic or provider
              </Text>
              <View
                className="rounded-lg bg-gray-50 border border-gray-200"
                style={{
                  paddingHorizontal: scale(12),
                }}
              >
                <TextInput
                  value={appointmentProvider}
                  onChangeText={setAppointmentProvider}
                  placeholder="Clinic or doctor name"
                  placeholderTextColor="#9CA3AF"
                  className="text-gray-900"
                  style={{
                    paddingVertical: getSpacing(10),
                    fontSize: getFontSize(12),
                  }}
                />
              </View>
              <Text
                className="text-gray-500"
                style={{
                  fontSize: getFontSize(9),
                  marginTop: getSpacing(3),
                }}
              >
                Optional, but helpful when you review this booking later.
              </Text>
            </View>

            <View style={{ marginTop: getSpacing(10) }}>
              <Text
                className="font-pmedium text-gray-700"
                style={{
                  fontSize: getFontSize(11),
                  marginBottom: getSpacing(4),
                }}
              >
                Notes
              </Text>
              <View
                className="rounded-lg bg-gray-50 border border-gray-200"
                style={{
                  paddingHorizontal: scale(12),
                }}
              >
                <TextInput
                  value={appointmentNotes}
                  onChangeText={setAppointmentNotes}
                  placeholder="Add any booking notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  textAlignVertical="top"
                  className="text-gray-900"
                  style={{
                    paddingVertical: getSpacing(10),
                    minHeight: scale(84),
                    fontSize: getFontSize(12),
                  }}
                />
              </View>
              <Text
                className="text-gray-500"
                style={{
                  fontSize: getFontSize(9),
                  marginTop: getSpacing(3),
                }}
              >
                Optional notes like location, prep instructions, or reference
                details.
              </Text>
            </View>

            <View
              className="flex-row"
              style={{ gap: scale(8), marginTop: getSpacing(10) }}
            >
              <TouchableOpacity
                onPress={submitBookedAppointment}
                className="flex-1 rounded-lg bg-secondary items-center justify-center"
                style={{ paddingVertical: getSpacing(10) }}
              >
                <Text
                  className="font-pmedium text-black"
                  style={{ fontSize: getFontSize(12) }}
                >
                  Save Appointment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAppointmentBack}
                className="flex-1 rounded-lg bg-gray-100 items-center justify-center"
                style={{ paddingVertical: getSpacing(10) }}
              >
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(12) }}
                >
                  {appointmentModalSource === "direct" ? "Close" : "Go Back"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ScreeningNextSteps;
