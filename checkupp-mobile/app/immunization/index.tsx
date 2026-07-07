import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  PixelRatio,
  Platform,
  Animated,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useToast } from "@/components/ToastProvider";
import HistoryViewer from "@/components/screening/HistoryViewer";
import { HistoryEntry } from "@/lib/storage/screeningStorage";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  createMyImmunisation,
  deleteMyImmunisation,
  getMyImmunisation,
  getMyImmunisationsSummary,
  listMyImmunisations,
  updateMyImmunisation,
  type ImmunisationPayload,
} from "@/lib/appwrite/immunisation";
import { ApiClientError } from "@/lib/api/client";
import UnifiedHealthModal from "@/components/screening/UnifiedHealthModal";
import UnifiedFormSection from "@/components/screening/UnifiedFormSection";
import UnifiedFormField from "@/components/screening/UnifiedFormField";
import UnifiedDatePicker from "@/components/screening/UnifiedDatePicker";
import UnifiedToggle from "@/components/screening/UnifiedToggle";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";

const { width, height } = Dimensions.get("window");

// Responsive scaling (same as pregnancy planner)
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

// Calculate proper bottom padding for tab bar
const getTabBarSafeBottomPadding = () => {
  const tabBarHeight = Platform.OS === "ios" ? 68 : 58;
  const extraPadding = getSpacing(24);
  const safeAreaPadding = Platform.OS === "ios" ? 34 : 0;
  return tabBarHeight + extraPadding + safeAreaPadding;
};

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
  isOverdue?: boolean;
  isDueSoon?: boolean;
  createdAt: string;
}

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

interface DoseUpdateErrors {
  doseNumber?: string;
  totalDoses?: string;
  nextDueDate?: string;
  backend?: string;
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

const ImmunisationPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showVaccinePicker, setShowVaccinePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showDoseUpdateModal, setShowDoseUpdateModal] = useState(false);
  const [selectedDoseRecordId, setSelectedDoseRecordId] = useState<
    string | null
  >(null);
  const [selectedDoseRecordName, setSelectedDoseRecordName] = useState("");
  const [isDoseUpdating, setIsDoseUpdating] = useState(false);
  const [doseUpdateForm, setDoseUpdateForm] = useState({
    doseNumber: "1",
    totalDoses: "1",
    nextDueDate: "",
  });
  const [doseUpdateErrors, setDoseUpdateErrors] = useState<DoseUpdateErrors>(
    {},
  );
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scrollY] = useState(new Animated.Value(0));

  const router = useRouter();
  const { showToast } = useToast();

  const [immunisationRecords, setImmunisationRecords] = useState<
    ImmunisationReading[]
  >([]);
  const [immunisationSummary, setImmunisationSummary] = useState({
    total: 0,
    upcoming: 0,
    dueSoon: 0,
    overdue: 0,
  });
  const [userAge] = useState(25);

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

  // Animation setup
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const updateFormData = (
    field: keyof ImmunisationData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
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

  const getDoseValidationError = () => {
    const doseNumber = Number(formData.doseNumber);
    const totalDoses = Number(formData.totalDoses);

    if (!Number.isInteger(doseNumber) || !Number.isInteger(totalDoses)) {
      return "Dose number and total doses must be whole numbers.";
    }

    if (doseNumber < 1 || totalDoses < 1) {
      return "Dose number and total doses must be at least 1.";
    }

    if (doseNumber > totalDoses) {
      return "Dose number cannot be greater than total doses.";
    }

    return null;
  };

  const isFormValid = () => {
    return (
      Boolean(formData.vaccineName) &&
      Boolean(formData.providerName) &&
      Boolean(formData.date) &&
      !getDoseValidationError()
    );
  };

  const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const toIsoDateTime = (value: string) => {
    const parsed = parseLocalDate(value);
    if (!parsed) return new Date().toISOString();
    parsed.setHours(9, 0, 0, 0);
    return parsed.toISOString();
  };

  const toIsoDate = useCallback((value: unknown, fallback?: string) => {
    if (!value && fallback) return fallback;
    if (!value) return format(new Date(), "yyyy-MM-dd");
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return fallback || format(new Date(), "yyyy-MM-dd");
    }
    return format(parsed, "yyyy-MM-dd");
  }, []);

  const mapApiRecord = useCallback(
    (item: any): ImmunisationReading => {
      const immunisation = item?.immunisation || {};
      const vaccine = item?.vaccine || immunisation || {};
      const sideEffects = item?.sideEffects || immunisation?.sideEffects || {};
      const travel =
        item?.travel || item?.travelRelated || immunisation?.travel || {};

      const normalizeVaccineType = (
        raw: unknown,
      ): ImmunisationData["vaccineType"] => {
        const value = String(raw || "routine").toLowerCase();
        if (value === "travel") return "travel";
        if (value === "occupational") return "occupational";
        if (value === "catch-up" || value === "catch_up") return "catch-up";
        if (value === "booster") return "booster";
        return "routine";
      };

      const vaccineType = normalizeVaccineType(
        vaccine.type || immunisation?.vaccineType || item?.vaccineType,
      );
      const site = (item?.administrationSite ||
        item?.site ||
        "left-arm") as ImmunisationData["site"];

      const createdAt = item?.createdAt
        ? new Date(item.createdAt).toISOString()
        : new Date().toISOString();

      return {
        id: String(item?.id || `immunisation_${Date.now()}`),
        date: toIsoDate(
          item?.performedAt || item?.date || immunisation?.performedAt,
        ),
        vaccine: {
          name: String(
            immunisation?.vaccineName ||
              vaccine?.name ||
              item?.vaccineName ||
              "Unknown Vaccine",
          ),
          type: vaccineType,
          brand:
            immunisation?.brand || vaccine.brand || item?.brand || undefined,
          batchNumber:
            immunisation?.batchNumber ||
            vaccine.batchNumber ||
            item?.batchNumber ||
            undefined,
        },
        doseNumber: Number(immunisation?.doseNumber || item?.doseNumber || 1),
        totalDoses: Number(immunisation?.totalDoses || item?.totalDoses || 1),
        site,
        provider: {
          name: String(
            item?.providerName || item?.provider?.name || "Unknown Provider",
          ),
          clinic: String(item?.clinic || item?.provider?.clinic || ""),
          location: String(item?.location || item?.provider?.location || ""),
        },
        nextDueDate:
          immunisation?.nextDueDate || item?.nextDueDate
            ? toIsoDate(immunisation?.nextDueDate || item?.nextDueDate)
            : undefined,
        sideEffects: {
          none: Boolean(sideEffects.none ?? item?.sideEffectsNone ?? true),
          mild: Boolean(sideEffects.mild ?? item?.sideEffectsMild ?? false),
          moderate: Boolean(
            sideEffects.moderate ?? item?.sideEffectsModerate ?? false,
          ),
          severe: Boolean(
            sideEffects.severe ?? item?.sideEffectsSevere ?? false,
          ),
          description:
            sideEffects.description ||
            item?.sideEffectsDescription ||
            undefined,
        },
        travelRelated: {
          isTravel: Boolean(
            travel.isTravel ?? item?.isTravel ?? vaccineType === "travel",
          ),
          destination:
            travel.destination || item?.travelDestination || undefined,
          departureDate: travel.departureDate
            ? toIsoDate(travel.departureDate)
            : item?.departureDate
              ? toIsoDate(item.departureDate)
              : undefined,
        },
        notes: item?.notes || undefined,
        wasCompleted: item?.wasCompleted ?? true,
        isOverdue: Boolean(item?.isOverdue ?? false),
        isDueSoon: Boolean(item?.isDueSoon ?? false),
        createdAt,
      };
    },
    [toIsoDate],
  );

  const loadImmunisationData = useCallback(
    async ({
      showLoader = false,
      page = 1,
    }: { showLoader?: boolean; page?: number } = {}) => {
      if (showLoader) {
        setIsInitialLoading(true);
      }

      try {
        const [listResult, summaryResult] = await Promise.all([
          listMyImmunisations({ page, pageSize }),
          getMyImmunisationsSummary(30),
        ]);

        const mapped = (listResult.data || []).map(mapApiRecord);
        setImmunisationRecords(mapped);
        setCurrentPage(listResult.pagination?.page || page);
        setTotalPages(listResult.pagination?.totalPages || 1);
        setImmunisationSummary({
          total: Number(summaryResult?.total || mapped.length || 0),
          upcoming: Number(summaryResult?.upcoming || 0),
          dueSoon: Number(summaryResult?.dueSoon || 0),
          overdue: Number(summaryResult?.overdue || 0),
        });
      } finally {
        if (showLoader) {
          setIsInitialLoading(false);
        }
      }
    },
    [mapApiRecord, pageSize],
  );

  useEffect(() => {
    loadImmunisationData({ showLoader: true }).catch((error) => {
      console.error("Failed to load immunisation records:", error);
      showToast("Failed to load immunisation records.", "error");
    });
  }, [loadImmunisationData, showToast]);

  const populateFormFromApiRecord = (raw: any) => {
    const immunisation = raw?.immunisation || {};
    const normalizeType = (value: unknown): ImmunisationData["vaccineType"] => {
      const v = String(value || "routine").toLowerCase();
      if (v === "travel") return "travel";
      if (v === "occupational") return "occupational";
      if (v === "catch-up" || v === "catch_up") return "catch-up";
      if (v === "booster") return "booster";
      return "routine";
    };

    setFormData({
      vaccineName: String(immunisation?.vaccineName || raw?.vaccineName || ""),
      vaccineType: normalizeType(immunisation?.vaccineType || raw?.vaccineType),
      brand: String(immunisation?.brand || raw?.brand || ""),
      batchNumber: String(immunisation?.batchNumber || raw?.batchNumber || ""),
      doseNumber: String(immunisation?.doseNumber || raw?.doseNumber || "1"),
      totalDoses: String(immunisation?.totalDoses || raw?.totalDoses || "1"),
      site: (raw?.administrationSite ||
        raw?.site ||
        "left-arm") as ImmunisationData["site"],
      providerName: String(raw?.providerName || raw?.provider?.name || ""),
      clinic: String(raw?.clinic || raw?.provider?.clinic || ""),
      location: String(raw?.location || raw?.provider?.location || ""),
      nextDueDate: immunisation?.nextDueDate
        ? toIsoDate(immunisation.nextDueDate)
        : raw?.nextDueDate
          ? toIsoDate(raw.nextDueDate)
          : "",
      sideEffectsNone: Boolean(
        raw?.sideEffects?.none ?? raw?.sideEffectsNone ?? true,
      ),
      sideEffectsMild: Boolean(
        raw?.sideEffects?.mild ?? raw?.sideEffectsMild ?? false,
      ),
      sideEffectsModerate: Boolean(
        raw?.sideEffects?.moderate ?? raw?.sideEffectsModerate ?? false,
      ),
      sideEffectsSevere: Boolean(
        raw?.sideEffects?.severe ?? raw?.sideEffectsSevere ?? false,
      ),
      sideEffectsDescription: String(
        raw?.sideEffects?.description || raw?.sideEffectsDescription || "",
      ),
      isTravel:
        normalizeType(immunisation?.vaccineType || raw?.vaccineType) ===
        "travel",
      travelDestination: String(
        raw?.travel?.destination || raw?.travelDestination || "",
      ),
      departureDate: raw?.travel?.departureDate
        ? toIsoDate(raw.travel.departureDate)
        : raw?.departureDate
          ? toIsoDate(raw.departureDate)
          : "",
      notes: String(raw?.notes || ""),
      date: toIsoDate(raw?.performedAt || raw?.date),
    });
  };

  const handleEditRecord = async (recordId: string) => {
    setIsLoading(true);
    try {
      const detail = await getMyImmunisation(recordId);
      populateFormFromApiRecord(detail);
      setEditingRecordId(recordId);
      setShowForm(true);
    } catch (error: any) {
      console.error("Failed to fetch immunisation details:", error);
      showToast(
        error?.message || "Failed to load immunisation details.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    Alert.alert(
      "Delete Immunisation",
      "Are you sure you want to delete this immunisation record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteMyImmunisation(recordId);
              const fallbackPage =
                immunisationRecords.length === 1 && currentPage > 1
                  ? currentPage - 1
                  : currentPage;
              await loadImmunisationData({ page: fallbackPage });
              showToast("Immunisation deleted.", "success");
            } catch (error: any) {
              console.error("Failed to delete immunisation:", error);
              showToast(
                error?.message || "Failed to delete immunisation.",
                "error",
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleOpenDoseUpdateModal = (record: ImmunisationReading) => {
    setSelectedDoseRecordId(record.id);
    setSelectedDoseRecordName(record.vaccine.name);
    setDoseUpdateForm({
      doseNumber: String(record.doseNumber || 1),
      totalDoses: String(record.totalDoses || 1),
      nextDueDate: record.nextDueDate || format(new Date(), "yyyy-MM-dd"),
    });
    setDoseUpdateErrors({});
    setShowDoseUpdateModal(true);
  };

  const validateDoseUpdateForm = () => {
    const errors: DoseUpdateErrors = {};
    const doseNumber = Number(doseUpdateForm.doseNumber);
    const totalDoses = Number(doseUpdateForm.totalDoses);
    const isSeriesComplete =
      Number.isInteger(doseNumber) &&
      Number.isInteger(totalDoses) &&
      doseNumber === totalDoses &&
      doseNumber > 0;

    if (!Number.isInteger(doseNumber) || doseNumber < 1) {
      errors.doseNumber = "Dose number must be a whole number from 1.";
    }

    if (!Number.isInteger(totalDoses) || totalDoses < 1) {
      errors.totalDoses = "Total doses must be a whole number from 1.";
    }

    if (
      Number.isInteger(doseNumber) &&
      Number.isInteger(totalDoses) &&
      doseNumber > totalDoses
    ) {
      errors.doseNumber = "Dose number cannot be greater than total doses.";
    }

    if (isSeriesComplete) {
      return errors;
    }

    if (!doseUpdateForm.nextDueDate) {
      errors.nextDueDate = "Next due date is required.";
      return errors;
    }

    const nextDueDate = parseLocalDate(doseUpdateForm.nextDueDate);
    if (!nextDueDate) {
      errors.nextDueDate = "Please select a valid next due date.";
    }

    return errors;
  };

  const applyBackendDoseErrors = (error: unknown) => {
    const errors: DoseUpdateErrors = {};
    const rawError = error as any;

    if (error instanceof ApiClientError && error.status === 400) {
      const details = error.details as any;
      const fieldKeys: (keyof DoseUpdateErrors)[] = [
        "doseNumber",
        "totalDoses",
        "nextDueDate",
      ];

      if (details && typeof details === "object") {
        fieldKeys.forEach((key) => {
          const value = details[key];
          if (typeof value === "string") {
            errors[key] = value;
          } else if (Array.isArray(value) && value.length > 0) {
            errors[key] = String(value[0]);
          }
        });

        if (Array.isArray(details.errors)) {
          details.errors.forEach((entry: any) => {
            if (!entry || typeof entry !== "object") return;
            const field = String(entry.field || "");
            const message = String(entry.message || "");
            if (
              field &&
              message &&
              fieldKeys.includes(field as keyof DoseUpdateErrors)
            ) {
              errors[field as keyof DoseUpdateErrors] = message;
            }
          });
        }
      }
    }

    const hasFieldError = Boolean(
      errors.doseNumber || errors.totalDoses || errors.nextDueDate,
    );

    if (!hasFieldError) {
      errors.backend =
        rawError?.message || "Unable to update immunisation details.";
    }

    setDoseUpdateErrors(errors);
  };

  const handleDoseUpdateSubmit = async () => {
    if (!selectedDoseRecordId) return;

    const clientErrors = validateDoseUpdateForm();
    if (Object.keys(clientErrors).length > 0) {
      setDoseUpdateErrors(clientErrors);
      return;
    }

    const doseNumber = Number(doseUpdateForm.doseNumber);
    const totalDoses = Number(doseUpdateForm.totalDoses);
    const isSeriesComplete =
      Number.isInteger(doseNumber) &&
      Number.isInteger(totalDoses) &&
      doseNumber === totalDoses &&
      doseNumber > 0;

    const payload = {
      doseNumber,
      totalDoses,
      nextDueDate: isSeriesComplete
        ? null
        : toIsoDateTime(doseUpdateForm.nextDueDate),
    };

    setDoseUpdateErrors({});
    setIsDoseUpdating(true);
    try {
      await updateMyImmunisation(selectedDoseRecordId, payload);

      const [listResult, summaryResult] = await Promise.all([
        listMyImmunisations({ page: 1, pageSize: 20 }),
        getMyImmunisationsSummary(30),
      ]);

      const mapped = (listResult.data || []).map(mapApiRecord);
      setImmunisationRecords(mapped);
      setCurrentPage(listResult.pagination?.page || 1);
      setTotalPages(listResult.pagination?.totalPages || 1);
      setImmunisationSummary({
        total: Number(summaryResult?.total || mapped.length || 0),
        upcoming: Number(summaryResult?.upcoming || 0),
        dueSoon: Number(summaryResult?.dueSoon || 0),
        overdue: Number(summaryResult?.overdue || 0),
      });

      if (showForm && editingRecordId === selectedDoseRecordId) {
        const detail = await getMyImmunisation(selectedDoseRecordId);
        populateFormFromApiRecord(detail);
      }

      setShowDoseUpdateModal(false);
      setSelectedDoseRecordId(null);
      showToast("Dose progress updated successfully.", "success");
    } catch (error) {
      console.error("Failed to update dose progress:", error);
      applyBackendDoseErrors(error);
    } finally {
      setIsDoseUpdating(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      const doseValidationError = getDoseValidationError();
      if (doseValidationError) {
        showToast(doseValidationError, "error");
        return;
      }
      showToast("Please fill in vaccine name, provider, and date", "error");
      return;
    }

    const formDoseNumber = Number(formData.doseNumber);
    const formTotalDoses = Number(formData.totalDoses);
    const isFullSeriesComplete =
      Number.isInteger(formDoseNumber) &&
      Number.isInteger(formTotalDoses) &&
      formDoseNumber === formTotalDoses &&
      formDoseNumber > 0;

    if (!isFullSeriesComplete && !formData.nextDueDate) {
      showToast(
        "Next due date is required when the dose series is not yet complete.",
        "error",
      );
      return;
    }

    if (!isFullSeriesComplete && formData.nextDueDate) {
      const vaccinationDate = parseLocalDate(formData.date);
      const nextDoseDate = parseLocalDate(formData.nextDueDate);
      if (
        !vaccinationDate ||
        !nextDoseDate ||
        nextDoseDate.getTime() < vaccinationDate.getTime()
      ) {
        showToast(
          "Next dose due date cannot be earlier than vaccination date.",
          "error",
        );
        return;
      }
    }

    if (formData.vaccineType === "travel") {
      if (!formData.travelDestination || !formData.departureDate) {
        showToast(
          "Travel destination and departure date are required for travel vaccines.",
          "error",
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const toEnumCase = (v: string) => v.toUpperCase().replace(/-/g, "_");

      const payload: ImmunisationPayload = {
        vaccineName: formData.vaccineName,
        vaccineType: toEnumCase(formData.vaccineType),
        brand: formData.brand || null,
        batchNumber: formData.batchNumber || null,
        doseNumber: Number(formData.doseNumber || "1"),
        totalDoses: Number(formData.totalDoses || "1"),
        administrationSite: toEnumCase(formData.site),
        providerName: formData.providerName || null,
        clinic: formData.clinic || null,
        location: formData.location || null,
        nextDueDate: isFullSeriesComplete ? null : formData.nextDueDate || null,
        sideEffectsNone: formData.sideEffectsNone,
        sideEffectsMild: formData.sideEffectsMild,
        sideEffectsModerate: formData.sideEffectsModerate,
        sideEffectsSevere: formData.sideEffectsSevere,
        sideEffectsDescription: formData.sideEffectsDescription || null,
        isTravel: formData.vaccineType === "travel",
        travelDestination: formData.travelDestination || null,
        departureDate: formData.departureDate || null,
        notes: formData.notes || null,
        source: "MOBILE_FORM",
        wasNormal: true,
      };

      console.log(
        "[Immunisation Save] Payload:",
        JSON.stringify(payload, null, 2),
      );

      if (editingRecordId) {
        await updateMyImmunisation(editingRecordId, payload);
      } else {
        await createMyImmunisation(payload);
      }

      await loadImmunisationData({ page: currentPage });
      resetForm();
      setEditingRecordId(null);

      setShowForm(false);
      showToast(
        editingRecordId
          ? "Immunisation updated successfully"
          : "Immunisation record added successfully",
        "success",
      );
    } catch (error: any) {
      console.error("Failed to save immunisation record:", error);
      if (error instanceof ApiClientError) {
        console.error("[Immunisation Save] Status:", error.status);
        console.error(
          "[Immunisation Save] Details:",
          JSON.stringify(error.details, null, 2),
        );
        console.error(
          "[Immunisation Save] Response body:",
          JSON.stringify(error.responseBody, null, 2),
        );
      }
      console.error(
        "[Immunisation Save] Form data:",
        JSON.stringify(formData, null, 2),
      );
      showToast(
        error?.message || "Failed to save immunisation record.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getImmunisationHistory = () => {
    return immunisationRecords.map<HistoryEntry>((record) => {
      const summaryParts = [
        `Vaccine: ${record.vaccine.name}`,
        `Dose: ${record.doseNumber}/${record.totalDoses}`,
        record.nextDueDate ? `Next dose: ${record.nextDueDate}` : "",
      ].filter(Boolean);

      return {
        id: record.id,
        date: record.date,
        result: summaryParts.join(", "),
        wasNormal: !record.sideEffects.severe,
        notes: record.notes,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      };
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadImmunisationData({ page: currentPage });
      showToast("Data refreshed", "success");
    } catch (error) {
      console.error("Failed to refresh immunisation records:", error);
      showToast("Failed to refresh data.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenNSWSchedule = () => {
    Alert.alert(
      "NSW Immunisation Schedule 2025",
      "This would open the official NSW Health Immunisation Schedule PDF document.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open PDF",
          onPress: () => {
            showToast("PDF would open here in production", "info");
          },
        },
      ],
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
              colors={["#10b981"]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: getTabBarSafeBottomPadding(),
          }}
        >
          {/* Compact Header with Back Button */}
          <View
            style={{
              paddingHorizontal: scale(12),
              paddingVertical: getSpacing(8),
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="justify-center items-center rounded-full bg-green-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={scale(18)}
                  color="#10B981"
                />
              </TouchableOpacity>

              <View className="flex-row items-center">
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(4),
                    marginRight: scale(6),
                    backgroundColor: "#10B98115",
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={scale(16)}
                    color="#10B981"
                  />
                </View>
                <Text
                  className="font-psemibold text-gray-800"
                  style={{ fontSize: getFontSize(18) }}
                >
                  Immunisation
                </Text>
              </View>

              <TouchableOpacity
                className="justify-center items-center rounded-full bg-green-50"
                style={{
                  width: scale(32),
                  height: scale(32),
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={scale(16)}
                  color="#10B981"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recommendations Card */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginHorizontal: scale(16),
              marginBottom: getSpacing(16),
            }}
          >
            <View
              className="bg-white rounded-xl border border-gray-100"
              style={{
                padding: scale(16),
              }}
            >
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(12) }}
              >
                <View
                  className="bg-amber-50 rounded-xl"
                  style={{ padding: scale(8) }}
                >
                  <MaterialCommunityIcons
                    name="star-outline"
                    size={scale(18)}
                    color="#F59E0B"
                  />
                </View>
                <Text
                  className="font-psemibold text-amber-800 ml-3"
                  style={{ fontSize: getFontSize(16) }}
                >
                  Recommended for Age {userAge}
                </Text>
              </View>

              <View
                className="bg-white/50 rounded-lg"
                style={{ padding: scale(12) }}
              >
                <Text
                  className="font-pregular text-amber-700"
                  style={{
                    fontSize: getFontSize(12),
                    lineHeight: getFontSize(16),
                  }}
                >
                  {getRecommendedVaccines().join(", ") ||
                    "No specific recommendations"}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginHorizontal: scale(12),
              marginBottom: getSpacing(16),
            }}
          >
            <View
              className="bg-white rounded-2xl border border-gray-100"
              style={{
                padding: scale(16),
              }}
            >
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(12) }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(8),
                    marginRight: scale(10),
                    backgroundColor: "#FBBF2415",
                  }}
                >
                  <MaterialCommunityIcons
                    name="lightbulb-on"
                    size={scale(18)}
                    color="#FBBF24"
                  />
                </View>
                <Text
                  className="font-psemibold text-black"
                  style={{ fontSize: getFontSize(16) }}
                >
                  Recommended for You
                </Text>
              </View>

              <View
                className="bg-gray-50 rounded-lg"
                style={{ padding: scale(12) }}
              >
                <Text
                  className="font-pregular text-gray-600"
                  style={{
                    fontSize: getFontSize(12),
                    lineHeight: getFontSize(16),
                  }}
                >
                  {getRecommendedVaccines().join(", ") ||
                    "No specific recommendations"}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              marginHorizontal: scale(16),
              marginBottom: getSpacing(16),
            }}
          >
            <Text
              className="font-psemibold text-black"
              style={{
                fontSize: getFontSize(16),
                marginBottom: getSpacing(12),
              }}
            >
              Quick Actions
            </Text>

            <View style={{ gap: getSpacing(10) }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingRecordId(null);
                  resetForm();
                  setShowForm(true);
                }}
                className="bg-white rounded-lg border border-gray-100"
                activeOpacity={0.7}
                style={{
                  padding: scale(14),
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View
                  className="rounded-lg"
                  style={{
                    padding: scale(8),
                    marginRight: scale(12),
                    backgroundColor: "#10B98115",
                  }}
                >
                  <Ionicons
                    name="add-circle"
                    size={scale(20)}
                    color="#10B981"
                  />
                </View>
                <Text
                  className="flex-1 font-pmedium text-black"
                  style={{ fontSize: getFontSize(14) }}
                >
                  Add New Vaccination
                </Text>
                <View
                  className="rounded-lg"
                  style={{ padding: scale(6), backgroundColor: "#10B98110" }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={scale(16)}
                    color="#10B981"
                  />
                </View>
              </TouchableOpacity>

              <View className="flex-row" style={{ gap: scale(8) }}>
                <TouchableOpacity
                  onPress={() => setShowScheduleModal(true)}
                  className="flex-1 bg-white rounded-lg border border-gray-100"
                  activeOpacity={0.7}
                  style={{
                    padding: scale(14),
                  }}
                >
                  <View className="flex-col items-center">
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(8),
                        marginBottom: scale(8),
                        backgroundColor: "#3B82F615",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="calendar-outline"
                        size={scale(20)}
                        color="#3B82F6"
                      />
                    </View>
                    <Text
                      className="font-pmedium text-black"
                      style={{ fontSize: getFontSize(13) }}
                    >
                      NSW Schedule
                    </Text>
                  </View>
                </TouchableOpacity>

                {getImmunisationHistory().length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowHistoryModal(true)}
                    className="flex-1 bg-white rounded-lg border border-gray-100"
                    activeOpacity={0.7}
                    style={{
                      padding: scale(14),
                    }}
                  >
                    <View className="flex-col items-center">
                      <View
                        className="rounded-lg"
                        style={{
                          padding: scale(8),
                          marginBottom: scale(8),
                          backgroundColor: "#8B5CF615",
                        }}
                      >
                        <MaterialCommunityIcons
                          name="history"
                          size={scale(20)}
                          color="#8B5CF6"
                        />
                      </View>
                      <Text
                        className="font-pmedium text-black"
                        style={{ fontSize: getFontSize(13) }}
                      >
                        History ({getImmunisationHistory().length})
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Recent Vaccinations */}
          {immunisationRecords.length > 0 && (
            <Animated.View
              style={{
                opacity: fadeAnim,
                marginHorizontal: scale(16),
                marginBottom: getSpacing(16),
              }}
            >
              <View className="bg-white rounded-lg border border-gray-100">
                <View
                  className="flex-row items-center"
                  style={{
                    padding: scale(14),
                    borderBottomWidth: 1,
                    borderBottomColor: "#F3F4F6",
                  }}
                >
                  <View
                    className="rounded-lg"
                    style={{
                      padding: scale(8),
                      marginRight: scale(10),
                      backgroundColor: "#10B98115",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="clipboard-list-outline"
                      size={scale(18)}
                      color="#10B981"
                    />
                  </View>
                  <Text
                    className="font-psemibold text-black"
                    style={{ fontSize: getFontSize(16) }}
                  >
                    Recent Vaccinations
                  </Text>
                </View>
                <View
                  className="flex-row items-center flex-wrap pt-2"
                  style={{
                    paddingHorizontal: scale(14),
                    paddingBottom: scale(10),
                    gap: scale(6),
                  }}
                >
                  <View
                    className="rounded-full flex-row items-center"
                    style={{
                      backgroundColor: "#DBEAFE",
                      paddingHorizontal: scale(8),
                      paddingVertical: scale(4),
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={scale(10)}
                      color="#1D4ED8"
                    />
                    <Text
                      className="font-psemibold ml-1"
                      style={{ fontSize: getFontSize(9), color: "#1D4ED8" }}
                    >
                      Upcoming {immunisationSummary.upcoming}
                    </Text>
                  </View>
                  <View
                    className="rounded-full flex-row items-center"
                    style={{
                      backgroundColor: "#FEF3C7",
                      paddingHorizontal: scale(8),
                      paddingVertical: scale(4),
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={scale(10)}
                      color="#B45309"
                    />
                    <Text
                      className="font-psemibold ml-1"
                      style={{ fontSize: getFontSize(9), color: "#B45309" }}
                    >
                      Soon {immunisationSummary.dueSoon}
                    </Text>
                  </View>
                  <View
                    className="rounded-full flex-row items-center"
                    style={{
                      backgroundColor: "#FEE2E2",
                      paddingHorizontal: scale(8),
                      paddingVertical: scale(4),
                    }}
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={scale(10)}
                      color="#B91C1C"
                    />
                    <Text
                      className="font-psemibold ml-1"
                      style={{ fontSize: getFontSize(9), color: "#B91C1C" }}
                    >
                      Overdue {immunisationSummary.overdue}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: scale(14) }}>
                  {immunisationRecords.length === 0 ? (
                    <View
                      className="flex-row items-center justify-center bg-gray-50 rounded-lg"
                      style={{ paddingVertical: getSpacing(24) }}
                    >
                      <MaterialCommunityIcons
                        name="needle"
                        size={scale(24)}
                        color="#9CA3AF"
                      />
                      <Text
                        className="font-pregular text-gray-500 ml-3"
                        style={{ fontSize: getFontSize(13) }}
                      >
                        No vaccinations recorded yet
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: getSpacing(8) }}>
                      {immunisationRecords.map((record) => {
                        const isSeriesComplete =
                          record.doseNumber >= record.totalDoses &&
                          record.totalDoses > 0;

                        return (
                          <Swipeable
                            key={record.id}
                            overshootLeft={false}
                            renderLeftActions={() => (
                              <TouchableOpacity
                                onPress={() => handleDeleteRecord(record.id)}
                                className="rounded-lg items-center justify-center bg-red-500"
                                style={{
                                  width: scale(92),
                                  marginRight: scale(8),
                                  marginVertical: scale(2),
                                }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={scale(18)}
                                  color="#FFFFFF"
                                />
                                <Text
                                  className="font-pmedium text-white"
                                  style={{
                                    fontSize: getFontSize(10),
                                    marginTop: scale(4),
                                  }}
                                >
                                  Delete
                                </Text>
                              </TouchableOpacity>
                            )}
                          >
                            <TouchableOpacity
                              onPress={() => handleOpenDoseUpdateModal(record)}
                              onLongPress={() => handleEditRecord(record.id)}
                              activeOpacity={0.75}
                              className={`rounded-lg border ${
                                isSeriesComplete
                                  ? "bg-green-50 border-green-200"
                                  : "bg-gray-50 border-gray-100"
                              }`}
                              style={{ padding: scale(10) }}
                            >
                              <View className="flex-row items-center justify-between">
                                <Text
                                  className="font-psemibold text-black"
                                  style={{ fontSize: getFontSize(13), flex: 1 }}
                                  numberOfLines={1}
                                >
                                  {record.vaccine.name}
                                </Text>
                                <Text
                                  className={`font-pregular ${
                                    isSeriesComplete
                                      ? "text-green-700"
                                      : "text-gray-500"
                                  }`}
                                  style={{ fontSize: getFontSize(11) }}
                                >
                                  {record.date}
                                </Text>
                              </View>
                              <Text
                                className={`font-pregular ${
                                  isSeriesComplete
                                    ? "text-green-800"
                                    : "text-gray-600"
                                }`}
                                style={{
                                  fontSize: getFontSize(11),
                                  marginTop: scale(4),
                                }}
                              >
                                {record.provider.name}
                              </Text>
                              <View
                                className="flex-row items-center flex-wrap"
                                style={{ marginTop: scale(6), gap: scale(6) }}
                              >
                                <View
                                  className="rounded-full"
                                  style={{
                                    backgroundColor: isSeriesComplete
                                      ? "#DCFCE7"
                                      : "#E0F2FE",
                                    paddingHorizontal: scale(8),
                                    paddingVertical: scale(4),
                                  }}
                                >
                                  <Text
                                    className="font-psemibold"
                                    style={{
                                      fontSize: getFontSize(10),
                                      color: isSeriesComplete
                                        ? "#166534"
                                        : "#0369A1",
                                    }}
                                  >
                                    Dose {record.doseNumber}/{record.totalDoses}
                                  </Text>
                                </View>
                                {isSeriesComplete ? (
                                  <View
                                    className="rounded-full flex-row"
                                    style={{
                                      paddingHorizontal: scale(8),
                                      paddingVertical: scale(4),
                                      marginLeft: "auto",
                                    }}
                                  >
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={scale(12)}
                                      color="#15803D"
                                    />
                                  </View>
                                ) : record.nextDueDate ? (
                                  <View
                                    className="rounded-full"
                                    style={{
                                      backgroundColor: record.isOverdue
                                        ? "#FEE2E2"
                                        : record.isDueSoon
                                          ? "#FEF3C7"
                                          : "#DCFCE7",
                                      paddingHorizontal: scale(8),
                                      paddingVertical: scale(4),
                                    }}
                                  >
                                    <Text
                                      className="font-psemibold"
                                      style={{
                                        fontSize: getFontSize(10),
                                        color: record.isOverdue
                                          ? "#B91C1C"
                                          : record.isDueSoon
                                            ? "#B45309"
                                            : "#166534",
                                      }}
                                    >
                                      Next due {record.nextDueDate}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text
                                className={`font-pregular ${
                                  isSeriesComplete
                                    ? "text-green-700"
                                    : "text-gray-400"
                                }`}
                                style={{
                                  fontSize: getFontSize(10),
                                  marginTop: scale(6),
                                }}
                              >
                                Tap to update dose • Long press for full edit •
                                Swipe right to delete
                              </Text>
                            </TouchableOpacity>
                          </Swipeable>
                        );
                      })}
                      <View
                        className="flex-row items-center justify-between"
                        style={{ marginTop: getSpacing(8) }}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            loadImmunisationData({ page: currentPage - 1 })
                          }
                          disabled={currentPage <= 1 || isLoading}
                          className={`rounded-xl border ${
                            currentPage <= 1 || isLoading
                              ? "bg-gray-100 border-gray-200"
                              : "bg-white border-gray-300"
                          }`}
                          style={{
                            paddingHorizontal: scale(12),
                            paddingVertical: scale(8),
                          }}
                        >
                          <Text
                            className={`font-pmedium ${
                              currentPage <= 1 || isLoading
                                ? "text-gray-400"
                                : "text-gray-700"
                            }`}
                            style={{ fontSize: getFontSize(11) }}
                          >
                            Prev
                          </Text>
                        </TouchableOpacity>
                        <Text
                          className="font-pmedium text-gray-500"
                          style={{ fontSize: getFontSize(11) }}
                        >
                          Page {currentPage} / {Math.max(totalPages, 1)}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            loadImmunisationData({ page: currentPage + 1 })
                          }
                          disabled={currentPage >= totalPages || isLoading}
                          className={`rounded-xl border ${
                            currentPage >= totalPages || isLoading
                              ? "bg-gray-100 border-gray-200"
                              : "bg-white border-gray-300"
                          }`}
                          style={{
                            paddingHorizontal: scale(12),
                            paddingVertical: scale(8),
                          }}
                        >
                          <Text
                            className={`font-pmedium ${
                              currentPage >= totalPages || isLoading
                                ? "text-gray-400"
                                : "text-gray-700"
                            }`}
                            style={{ fontSize: getFontSize(11) }}
                          >
                            Next
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.ScrollView>

        {/* History Modal */}
        <HistoryViewer
          visible={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          screeningName="Immunisation Check"
          history={getImmunisationHistory()}
          isFullHistory={false}
        />

        {/* NSW Schedule Modal */}
        <UnifiedHealthModal
          visible={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title="NSW Immunisation Schedule 2025"
          subtitle="Comprehensive vaccination schedule for all ages"
          icon="calendar-outline"
        >
          {/* PDF Reference */}
          <TouchableOpacity
            onPress={handleOpenNSWSchedule}
            className="bg-gray-50 rounded-lg flex-row items-center justify-between"
            activeOpacity={0.7}
            style={{
              padding: scale(12),
              marginBottom: getSpacing(16),
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <View className="flex-row items-center flex-1">
              <View
                className="rounded-lg"
                style={{
                  padding: scale(8),
                  marginRight: scale(10),
                  backgroundColor: "#10B98115",
                }}
              >
                <Ionicons
                  name="document-text"
                  size={scale(20)}
                  color="#10B981"
                />
              </View>
              <View>
                <Text
                  className="font-psemibold text-black"
                  style={{ fontSize: getFontSize(13) }}
                >
                  Official NSW Schedule PDF
                </Text>
                <Text
                  className="font-pregular text-gray-500"
                  style={{ fontSize: getFontSize(11) }}
                >
                  Complete reference guide
                </Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={scale(16)} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Schedule Sections */}
          {Object.entries(NSW_IMMUNISATION_SCHEDULE).map(
            ([category, items], index) => {
              const colors = [
                { bg: "#3B82F615", text: "#3B82F6" }, // blue
                { bg: "#8B5CF615", text: "#8B5CF6" }, // purple
                { bg: "#10B98115", text: "#10B981" }, // green
                { bg: "#F59E0B15", text: "#F59E0B" }, // amber
                { bg: "#EC489915", text: "#EC4899" }, // pink
                { bg: "#FF9C0115", text: "#FF9C01" }, // orange
              ];
              const color = colors[index % colors.length];

              return (
                <View
                  key={category}
                  className="bg-white rounded-lg border border-gray-100"
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(12),
                  }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(8) }}
                  >
                    <View
                      className="rounded-lg"
                      style={{
                        padding: scale(6),
                        marginRight: scale(8),
                        backgroundColor: color.bg,
                      }}
                    >
                      <View
                        style={{
                          width: scale(4),
                          height: scale(4),
                          borderRadius: scale(2),
                          backgroundColor: color.text,
                        }}
                      />
                    </View>
                    <Text
                      className="font-psemibold text-black capitalize"
                      style={{ fontSize: getFontSize(14) }}
                    >
                      {category}
                    </Text>
                  </View>
                  {items.map((item: any, itemIndex: number) => (
                    <View
                      key={itemIndex}
                      className="bg-gray-50 rounded-lg"
                      style={{
                        padding: scale(10),
                        marginBottom:
                          itemIndex < items.length - 1 ? getSpacing(6) : 0,
                      }}
                    >
                      <Text
                        className="font-pmedium text-black"
                        style={{
                          fontSize: getFontSize(12),
                          marginBottom: scale(4),
                        }}
                      >
                        {item.age || item.destination}
                      </Text>
                      <Text
                        className="font-pregular text-gray-600"
                        style={{ fontSize: getFontSize(11) }}
                      >
                        {item.vaccines.join(", ")}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            },
          )}
        </UnifiedHealthModal>

        {/* Form Modal */}
        <UnifiedHealthModal
          visible={showDoseUpdateModal}
          onClose={() => {
            if (isDoseUpdating) return;
            setShowDoseUpdateModal(false);
            setSelectedDoseRecordId(null);
            setDoseUpdateErrors({});
          }}
          title="Update Dose Progress"
          subtitle={selectedDoseRecordName || "Update dose and next due date"}
          icon="pulse-outline"
        >
          <UnifiedFormSection
            title="Dose Tracking"
            icon="layers-outline"
            description="Record next dose and set the next due date."
          >
            <View className="flex-row" style={{ gap: scale(12) }}>
              <View className="flex-1">
                <UnifiedFormField
                  label="Dose Number"
                  value={doseUpdateForm.doseNumber}
                  onChangeText={(value) => {
                    const nextDose = value.replace(/[^0-9]/g, "");
                    setDoseUpdateForm((prev) => {
                      const nextState = { ...prev, doseNumber: nextDose };
                      const doseNumber = Number(nextState.doseNumber);
                      const totalDoses = Number(nextState.totalDoses);
                      const isSeriesComplete =
                        Number.isInteger(doseNumber) &&
                        Number.isInteger(totalDoses) &&
                        doseNumber === totalDoses &&
                        doseNumber > 0;
                      if (isSeriesComplete) {
                        nextState.nextDueDate = "";
                      }
                      return nextState;
                    });
                    setDoseUpdateErrors((prev) => ({
                      ...prev,
                      doseNumber: "",
                    }));
                  }}
                  keyboardType="numeric"
                  required
                  error={doseUpdateErrors.doseNumber}
                />
              </View>
              <View className="flex-1">
                <UnifiedFormField
                  label="Total Doses"
                  value={doseUpdateForm.totalDoses}
                  onChangeText={(value) => {
                    const nextTotal = value.replace(/[^0-9]/g, "");
                    setDoseUpdateForm((prev) => {
                      const nextState = { ...prev, totalDoses: nextTotal };
                      const doseNumber = Number(nextState.doseNumber);
                      const totalDoses = Number(nextState.totalDoses);
                      const isSeriesComplete =
                        Number.isInteger(doseNumber) &&
                        Number.isInteger(totalDoses) &&
                        doseNumber === totalDoses &&
                        doseNumber > 0;
                      if (isSeriesComplete) {
                        nextState.nextDueDate = "";
                      }
                      return nextState;
                    });
                    setDoseUpdateErrors((prev) => ({
                      ...prev,
                      totalDoses: "",
                    }));
                  }}
                  keyboardType="numeric"
                  required
                  error={doseUpdateErrors.totalDoses}
                />
              </View>
            </View>

            <View
              pointerEvents={
                Number(doseUpdateForm.doseNumber) ===
                  Number(doseUpdateForm.totalDoses) &&
                Number(doseUpdateForm.doseNumber) > 0
                  ? "none"
                  : "auto"
              }
              style={{
                opacity:
                  Number(doseUpdateForm.doseNumber) ===
                    Number(doseUpdateForm.totalDoses) &&
                  Number(doseUpdateForm.doseNumber) > 0
                    ? 0.55
                    : 1,
              }}
            >
              <UnifiedDatePicker
                label="Next Dose Due Date"
                value={parseLocalDate(doseUpdateForm.nextDueDate) || new Date()}
                onChange={(date) => {
                  setDoseUpdateForm((prev) => ({
                    ...prev,
                    nextDueDate: format(date, "yyyy-MM-dd"),
                  }));
                  setDoseUpdateErrors((prev) => ({ ...prev, nextDueDate: "" }));
                }}
                required={
                  !(
                    Number(doseUpdateForm.doseNumber) ===
                      Number(doseUpdateForm.totalDoses) &&
                    Number(doseUpdateForm.doseNumber) > 0
                  )
                }
                error={
                  Number(doseUpdateForm.doseNumber) ===
                    Number(doseUpdateForm.totalDoses) &&
                  Number(doseUpdateForm.doseNumber) > 0
                    ? undefined
                    : doseUpdateErrors.nextDueDate
                }
                icon="alarm-outline"
                minDate={new Date()}
                maxDate={new Date("2100-12-31")}
              />
            </View>
            {Number(doseUpdateForm.doseNumber) ===
              Number(doseUpdateForm.totalDoses) &&
            Number(doseUpdateForm.doseNumber) > 0 ? (
              <Text
                className="font-pmedium text-gray-500"
                style={{
                  fontSize: getFontSize(11),
                  marginTop: -getSpacing(6),
                  marginBottom: getSpacing(10),
                }}
              >
                Next due date is disabled when dose series is complete.
              </Text>
            ) : null}

            {doseUpdateErrors.backend ? (
              <View
                className="rounded-lg border border-red-200 bg-red-50"
                style={{
                  paddingHorizontal: scale(10),
                  paddingVertical: getSpacing(10),
                  marginBottom: getSpacing(8),
                }}
              >
                <Text
                  className="font-pmedium text-red-600"
                  style={{ fontSize: getFontSize(11) }}
                >
                  {doseUpdateErrors.backend}
                </Text>
              </View>
            ) : null}

            <UnifiedActionButton
              title={isDoseUpdating ? "Updating..." : "Update Dose Progress"}
              onPress={handleDoseUpdateSubmit}
              loading={isDoseUpdating}
              disabled={isDoseUpdating}
            />
          </UnifiedFormSection>
        </UnifiedHealthModal>

        {/* Form Modal */}
        <UnifiedHealthModal
          visible={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingRecordId(null);
            resetForm();
          }}
          title={editingRecordId ? "Edit Immunisation" : "Add Immunisation"}
          subtitle={
            editingRecordId
              ? "Update vaccination details and information"
              : "Record vaccination details and information"
          }
          icon="shield-checkmark-outline"
        >
          {/* Date Selection */}
          <UnifiedDatePicker
            label="Vaccination Date"
            value={new Date(formData.date)}
            onChange={(date) =>
              updateFormData("date", format(date, "yyyy-MM-dd"))
            }
            required
            icon="calendar-outline"
          />

          {/* Vaccine Information Section */}
          <UnifiedFormSection
            title="Vaccine Information"
            icon="medical-outline"
            description="Details about the vaccine administered"
          >
            {/* Vaccine Name Picker */}
            <View style={{ marginBottom: getSpacing(12) }}>
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(6) }}
              >
                <Ionicons
                  name="flask-outline"
                  size={scale(12)}
                  color="#FF9C01"
                  style={{ marginRight: scale(5) }}
                />
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(12) }}
                >
                  Vaccine Name <Text className="text-[#FF9C01]">*</Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowVaccinePicker(true)}
                className="flex-row items-center justify-between bg-gray-50 rounded-lg border border-gray-200"
                style={{
                  paddingHorizontal: scale(10),
                  paddingVertical: getSpacing(10),
                  minHeight: scale(40),
                }}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-pregular ${
                    formData.vaccineName ? "text-gray-900" : "text-gray-400"
                  }`}
                  style={{ fontSize: getFontSize(13), flex: 1 }}
                >
                  {formData.vaccineName || "Select vaccine"}
                </Text>
                <Ionicons
                  name="chevron-down-outline"
                  size={scale(16)}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: getSpacing(4) }} />

            <UnifiedToggle
              label="Vaccine Type"
              options={[
                {
                  label: "Routine",
                  value: "routine",
                  icon: "calendar-outline",
                },
                { label: "Travel", value: "travel", icon: "airplane-outline" },
                {
                  label: "Occupational",
                  value: "occupational",
                  icon: "briefcase-outline",
                },
                { label: "Catch-up", value: "catch-up", icon: "time-outline" },
                {
                  label: "Booster",
                  value: "booster",
                  icon: "trending-up-outline",
                },
              ]}
              selectedValue={formData.vaccineType}
              onSelect={(value) =>
                updateFormData("vaccineType", value as string)
              }
            />

            <View style={{ marginTop: getSpacing(8) }} />

            <View className="flex-row" style={{ gap: scale(12) }}>
              <View className="flex-1">
                <UnifiedFormField
                  label="Brand"
                  value={formData.brand}
                  onChangeText={(text) => updateFormData("brand", text)}
                  placeholder="e.g., Pfizer, Moderna"
                />
              </View>
              <View className="flex-1">
                <UnifiedFormField
                  label="Batch Number"
                  value={formData.batchNumber}
                  onChangeText={(text) => updateFormData("batchNumber", text)}
                  placeholder="Optional"
                />
              </View>
            </View>

            <View style={{ marginTop: getSpacing(8) }} />

            <View className="flex-row" style={{ gap: scale(12) }}>
              <View className="flex-1">
                <UnifiedFormField
                  label="Dose Number"
                  value={formData.doseNumber}
                  onChangeText={(value) => {
                    const nextDose = value.replace(/[^0-9]/g, "");
                    const totalDoses = Number(formData.totalDoses);
                    const doseNumber = Number(nextDose);
                    const isSeriesComplete =
                      Number.isInteger(doseNumber) &&
                      Number.isInteger(totalDoses) &&
                      doseNumber === totalDoses &&
                      doseNumber > 0;
                    updateFormData("doseNumber", nextDose);
                    if (isSeriesComplete) {
                      updateFormData("nextDueDate", "");
                    }
                  }}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <UnifiedFormField
                  label="Total Doses"
                  value={formData.totalDoses}
                  onChangeText={(value) => {
                    const nextTotal = value.replace(/[^0-9]/g, "");
                    const doseNumber = Number(formData.doseNumber);
                    const totalDoses = Number(nextTotal);
                    const isSeriesComplete =
                      Number.isInteger(doseNumber) &&
                      Number.isInteger(totalDoses) &&
                      doseNumber === totalDoses &&
                      doseNumber > 0;
                    updateFormData("totalDoses", nextTotal);
                    if (isSeriesComplete) {
                      updateFormData("nextDueDate", "");
                    }
                  }}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ marginTop: getSpacing(8) }} />

            <UnifiedToggle
              label="Injection Site"
              options={[
                {
                  label: "Left Arm",
                  value: "left-arm",
                },
                {
                  label: "Right Arm",
                  value: "right-arm",
                },
                { label: "Left Thigh", value: "left-thigh" },
                { label: "Right Thigh", value: "right-thigh" },
                { label: "Oral", value: "oral" },
                { label: "Nasal", value: "nasal" },
              ]}
              selectedValue={formData.site}
              onSelect={(value) => updateFormData("site", value as string)}
            />
          </UnifiedFormSection>

          <View style={{ marginTop: getSpacing(16) }} />

          {/* Provider Information Section */}
          <UnifiedFormSection
            title="Provider Information"
            icon="person-outline"
            description="Healthcare provider details"
          >
            <UnifiedFormField
              label="Provider Name"
              value={formData.providerName}
              onChangeText={(text) => updateFormData("providerName", text)}
              placeholder="Dr. Smith"
              required
              icon="medical-outline"
            />

            <UnifiedFormField
              label="Clinic/Hospital"
              value={formData.clinic}
              onChangeText={(text) => updateFormData("clinic", text)}
              placeholder="Sydney Medical Centre"
              icon="business-outline"
            />

            <UnifiedFormField
              label="Location"
              value={formData.location}
              onChangeText={(text) => updateFormData("location", text)}
              placeholder="Sydney, NSW"
              icon="location-outline"
            />
          </UnifiedFormSection>

          <View style={{ marginTop: getSpacing(16) }} />

          {/* Travel Section */}
          {formData.vaccineType === "travel" && (
            <UnifiedFormSection
              title="Travel Information"
              icon="airplane-outline"
              description="Travel-related vaccination details"
            >
              <UnifiedFormField
                label="Destination"
                value={formData.travelDestination}
                onChangeText={(text) =>
                  updateFormData("travelDestination", text)
                }
                placeholder="Thailand, India, etc."
                icon="globe-outline"
              />

              <UnifiedDatePicker
                label="Departure Date"
                value={
                  formData.departureDate
                    ? new Date(formData.departureDate)
                    : new Date()
                }
                onChange={(date) =>
                  updateFormData("departureDate", format(date, "yyyy-MM-dd"))
                }
                maxDate={new Date("2100-12-31")}
                icon="calendar-outline"
              />
            </UnifiedFormSection>
          )}

          <View style={{ marginTop: getSpacing(16) }} />

          {/* Side Effects Section */}
          <UnifiedFormSection
            title="Side Effects"
            icon="alert-circle-outline"
            description="Any reactions or side effects experienced"
          >
            <UnifiedToggle
              label="Severity"
              options={[
                {
                  label: "None",
                  value: "none",
                  icon: "checkmark-circle-outline",
                  description: "No reactions",
                },
                {
                  label: "Mild",
                  value: "mild",
                  icon: "ellipse-outline",
                  description: "Soreness, low fever",
                },
                {
                  label: "Moderate",
                  value: "moderate",
                  icon: "alert-outline",
                  description: "Fever, fatigue",
                },
                {
                  label: "Severe",
                  value: "severe",
                  icon: "alert-circle",
                  description: "Allergic reaction",
                },
              ]}
              selectedValue={
                formData.sideEffectsNone
                  ? "none"
                  : formData.sideEffectsSevere
                    ? "severe"
                    : formData.sideEffectsModerate
                      ? "moderate"
                      : formData.sideEffectsMild
                        ? "mild"
                        : "none"
              }
              onSelect={(value) => {
                const severity = value as string;
                updateFormData("sideEffectsNone", severity === "none");
                updateFormData("sideEffectsMild", severity === "mild");
                updateFormData("sideEffectsModerate", severity === "moderate");
                updateFormData("sideEffectsSevere", severity === "severe");
              }}
            />

            {!formData.sideEffectsNone && (
              <>
                <View style={{ marginTop: getSpacing(12) }} />
                <UnifiedFormField
                  label="Description"
                  value={formData.sideEffectsDescription}
                  onChangeText={(text) =>
                    updateFormData("sideEffectsDescription", text)
                  }
                  placeholder="Describe any side effects..."
                  multiline
                  icon="document-text-outline"
                />
              </>
            )}
          </UnifiedFormSection>

          <View style={{ marginTop: getSpacing(16) }} />

          {/* Additional Information Section */}
          <UnifiedFormSection
            title="Additional Information"
            icon="information-circle-outline"
          >
            <View
              pointerEvents={
                Number(formData.doseNumber) === Number(formData.totalDoses) &&
                Number(formData.doseNumber) > 0
                  ? "none"
                  : "auto"
              }
              style={{
                opacity:
                  Number(formData.doseNumber) === Number(formData.totalDoses) &&
                  Number(formData.doseNumber) > 0
                    ? 0.55
                    : 1,
              }}
            >
              <UnifiedDatePicker
                label="Next Dose Due Date"
                value={
                  formData.nextDueDate
                    ? new Date(formData.nextDueDate)
                    : new Date()
                }
                onChange={(date) =>
                  updateFormData("nextDueDate", format(date, "yyyy-MM-dd"))
                }
                minDate={
                  parseLocalDate(formData.date) ||
                  new Date(formData.date || Date.now())
                }
                maxDate={new Date("2100-12-31")}
                icon="calendar-outline"
              />
            </View>
            {Number(formData.doseNumber) === Number(formData.totalDoses) &&
            Number(formData.doseNumber) > 0 ? (
              <Text
                className="font-pmedium text-gray-500"
                style={{
                  fontSize: getFontSize(11),
                  marginTop: -getSpacing(6),
                  marginBottom: getSpacing(10),
                }}
              >
                Next due date is disabled when dose series is complete.
              </Text>
            ) : null}

            <UnifiedFormField
              label="Additional Notes"
              value={formData.notes}
              onChangeText={(text) => updateFormData("notes", text)}
              placeholder="Any additional information..."
              multiline
              icon="create-outline"
            />
          </UnifiedFormSection>

          <View style={{ marginTop: getSpacing(20) }} />

          <UnifiedActionButton
            title={
              isLoading
                ? "Saving..."
                : editingRecordId
                  ? "Update Immunisation"
                  : "Save Immunisation"
            }
            onPress={handleSubmit}
            disabled={!isFormValid() || isLoading}
            loading={isLoading}
          />
        </UnifiedHealthModal>

        {/* Vaccine Picker Modal */}
        <UnifiedHealthModal
          visible={showVaccinePicker}
          onClose={() => setShowVaccinePicker(false)}
          title="Select Vaccine"
          icon="flask-outline"
        >
          {COMMON_VACCINES.map((vaccine) => (
            <TouchableOpacity
              key={vaccine}
              onPress={() => {
                updateFormData("vaccineName", vaccine);
                setShowVaccinePicker(false);
              }}
              className="border-b border-gray-100"
              style={{
                paddingVertical: getSpacing(14),
                paddingHorizontal: scale(4),
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className={`font-pregular ${
                    formData.vaccineName === vaccine
                      ? "text-[#10B981] font-pmedium"
                      : "text-gray-900"
                  }`}
                  style={{ fontSize: getFontSize(14), flex: 1 }}
                >
                  {vaccine}
                </Text>
                {formData.vaccineName === vaccine && (
                  <Ionicons
                    name="checkmark-circle"
                    size={scale(20)}
                    color="#10B981"
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </UnifiedHealthModal>
        <LoadingSpinner visible={isInitialLoading || isLoading} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ImmunisationPage;
