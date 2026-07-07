import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "@/components/ToastProvider";
import {
  approveMyConsentRequest,
  consentScopeDomainValues,
  declineMyConsentRequest,
  listMyConsentRequests,
  revokeMyConsent,
  type ConsentAccessLevel,
  type ConsentRequest,
  type ConsentScopeDomain,
  type ConsentStatus,
} from "@/lib/appwrite/consent";
import useApiQuery from "@/lib/query/useApiQuery";

type HistoryStatus = "ACTIVE" | "DECLINED" | "REVOKED";

const historyTabs: HistoryStatus[] = ["ACTIVE", "DECLINED", "REVOKED"];

const domainLabels: Record<ConsentScopeDomain, string> = {
  screenings: "Screenings",
  documents: "Documents",
  pregnancy: "Pregnancy",
  feedback: "Feedback",
  profile: "Profile",
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const domainsToText = (domains: ConsentScopeDomain[]) =>
  domains.map((domain) => domainLabels[domain]).join(", ");

const normalizeDomains = (request: ConsentRequest) => {
  const preferred = request.scope?.domains ?? request.requestedScope?.domains;
  if (Array.isArray(preferred) && preferred.length > 0) {
    return preferred.filter((domain): domain is ConsentScopeDomain =>
      consentScopeDomainValues.includes(domain),
    );
  }

  return ["screenings", "documents", "profile"] as ConsentScopeDomain[];
};

const clinicianNameFor = (request: ConsentRequest) =>
  request.clinician?.user?.name || request.clinician?.user?.email || "Clinician";

const statusStyle: Record<
  ConsentStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  REQUESTED: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Pending",
  },
  ACTIVE: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
    label: "Active",
  },
  DECLINED: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    label: "Declined",
  },
  REVOKED: {
    bg: "bg-gray-200",
    text: "text-gray-700",
    border: "border-gray-300",
    label: "Revoked",
  },
  EXPIRED: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "Expired",
  },
};

export default function ConsentRequestsScreen() {
  const { showToast } = useToast();
  const [historyTab, setHistoryTab] = useState<HistoryStatus>("ACTIVE");
  const [selectedRequest, setSelectedRequest] = useState<ConsentRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [accessLevel, setAccessLevel] = useState<ConsentAccessLevel>("READ_ONLY");
  const [domains, setDomains] = useState<ConsentScopeDomain[]>([
    "screenings",
    "documents",
    "profile",
  ]);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const pendingQuery = useApiQuery(
    () => listMyConsentRequests("REQUESTED"),
    {
      queryKey: ["my-consent-pending", "REQUESTED"],
      staleTime: 10_000,
    },
  );

  const historyQuery = useApiQuery(
    () => listMyConsentRequests(historyTab),
    {
      queryKey: ["my-consent-history", historyTab],
      staleTime: 10_000,
    },
  );

  const pendingRequests = useMemo(
    () =>
      (pendingQuery.data ?? []).filter(
        (request) => String(request.status).toUpperCase() === "REQUESTED",
      ),
    [pendingQuery.data],
  );

  const historyItems = useMemo(
    () =>
      (historyQuery.data ?? []).filter(
        (request) => String(request.status).toUpperCase() === historyTab,
      ),
    [historyQuery.data, historyTab],
  );

  const refreshAll = async () => {
    await Promise.allSettled([pendingQuery.refetch(), historyQuery.refetch()]);
  };

  const openApprovalModal = (request: ConsentRequest) => {
    const requestDomains = normalizeDomains(request);
    setSelectedRequest(request);
    setAccessLevel(request.requestedScope?.accessLevel ?? "READ_ONLY");
    setDomains(requestDomains);
    setIncludeHistory(request.requestedScope?.includeHistory ?? true);
    setModalVisible(true);
  };

  const closeApprovalModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setSelectedRequest(null);
  };

  const toggleDomain = (domain: ConsentScopeDomain, enabled: boolean) => {
    setDomains((previous) => {
      const next = new Set(previous);
      if (enabled) next.add(domain);
      else next.delete(domain);
      return Array.from(next);
    });
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (domains.length === 0) {
      showToast("Select at least one data domain before approving.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await approveMyConsentRequest(selectedRequest.id, {
        scope: {
          accessLevel,
          domains,
          includeHistory,
        },
      });
      showToast("Consent approved successfully.", "success");
      closeApprovalModal();
      setHistoryTab("ACTIVE");
      await refreshAll();
    } catch (error: any) {
      showToast(error?.message || "Failed to approve consent request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = (request: ConsentRequest) => {
    Alert.alert(
      "Decline consent request",
      "Are you sure you want to decline this clinician request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            try {
              await declineMyConsentRequest(request.id);
              showToast("Consent request declined.", "success");
              setHistoryTab("DECLINED");
              await refreshAll();
            } catch (error: any) {
              showToast(error?.message || "Failed to decline consent request.", "error");
            }
          },
        },
      ],
    );
  };

  const handleRevoke = (request: ConsentRequest) => {
    Alert.alert(
      "Revoke active consent",
      "This clinician will immediately lose access to your approved data scope.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeMyConsent(request.id);
              showToast("Consent revoked.", "success");
              setHistoryTab("REVOKED");
              await refreshAll();
            } catch (error: any) {
              showToast(error?.message || "Failed to revoke consent.", "error");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="border-b border-gray-200 bg-white px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => router.back()} className="mr-1 rounded-full p-1.5">
              <Ionicons name="arrow-back" size={20} color="#111827" />
            </TouchableOpacity>
            <View>
              <Text className="font-psemibold text-base text-gray-900">Consent Center</Text>
              <Text className="font-pregular text-xs text-gray-500">
                Pending approvals and consent history
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={refreshAll}
            className="rounded-lg border border-gray-200 px-3 py-1.5"
          >
            <Text className="font-pmedium text-xs text-gray-700">Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 16 }}>
          <View className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View>
                <Text className="font-psemibold text-sm text-amber-900">Pending Requests</Text>
                <Text className="font-pregular text-xs text-amber-700">
                  Approve or decline clinician access requests
                </Text>
              </View>
              <View className="rounded-full bg-white px-2.5 py-1">
                <Text className="font-pmedium text-xs text-amber-700">{pendingRequests.length}</Text>
              </View>
            </View>

            {pendingQuery.loading ? (
              <View className="py-3">
                <ActivityIndicator size="small" color="#FF9C01" />
              </View>
            ) : pendingRequests.length === 0 ? (
              <View className="rounded-lg border border-amber-200 bg-white px-3 py-3">
                <Text className="font-pregular text-xs text-gray-600">
                  No pending requests at the moment.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {pendingRequests.map((request) => {
                  const requestedDomains = normalizeDomains(request);

                  return (
                    <View
                      key={request.id}
                      className="rounded-xl border border-amber-200 bg-white p-3"
                    >
                      <View className="mb-2 flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="font-psemibold text-sm text-gray-900">
                            {clinicianNameFor(request)}
                          </Text>
                          <Text className="font-pregular text-xs text-gray-500">
                            {request.clinician?.specialty || "General Practice"}
                          </Text>
                        </View>
                        <View className="rounded-full bg-amber-100 px-2.5 py-1">
                          <Text className="font-pmedium text-[10px] uppercase tracking-wide text-amber-700">
                            Pending
                          </Text>
                        </View>
                      </View>

                      <Text className="font-pregular text-xs text-gray-600">
                        Requested scope: {domainsToText(requestedDomains)}
                      </Text>
                      <Text className="mt-1 font-pregular text-xs text-gray-500">
                        Requested: {formatDate(request.requestedAt || request.createdAt)}
                      </Text>

                      {request.requestMessage ? (
                        <Text className="mt-2 font-pregular text-xs text-gray-600">
                          Note: {request.requestMessage}
                        </Text>
                      ) : null}

                      <View className="mt-3 flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => openApprovalModal(request)}
                          className="flex-1 rounded-lg bg-orange-500 px-3 py-2.5"
                        >
                          <Text className="text-center font-psemibold text-xs text-white">
                            Review & Approve
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDecline(request)}
                          className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
                        >
                          <Text className="text-center font-psemibold text-xs text-red-700">
                            Decline
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <View className="mb-3">
              <Text className="font-psemibold text-sm text-gray-900">Consent History</Text>
              <Text className="font-pregular text-xs text-gray-500">
                Track all approved and closed consent decisions
              </Text>
            </View>

            <View className="mb-3 flex-row rounded-xl bg-gray-100 p-1">
              {historyTabs.map((tab) => {
                const active = historyTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setHistoryTab(tab)}
                    className={`flex-1 rounded-lg px-2 py-2 ${active ? "bg-white" : ""}`}
                  >
                    <Text
                      className={`text-center font-psemibold text-xs ${
                        active ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {historyQuery.loading ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#FF9C01" />
              </View>
            ) : historyItems.length === 0 ? (
              <View className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4">
                <Text className="text-center font-pregular text-xs text-gray-500">
                  No {historyTab.toLowerCase()} consent entries yet.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {historyItems.map((request) => {
                  const status = String(request.status).toUpperCase() as ConsentStatus;
                  const badge = statusStyle[status] || statusStyle.REVOKED;
                  const scopedDomains = normalizeDomains(request);

                  return (
                    <View
                      key={`history-${request.id}`}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <View className="mb-2 flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="font-psemibold text-sm text-gray-900">
                            {clinicianNameFor(request)}
                          </Text>
                          <Text className="font-pregular text-xs text-gray-500">
                            Scope: {domainsToText(scopedDomains)}
                          </Text>
                        </View>
                        <View className={`rounded-full border px-2.5 py-1 ${badge.bg} ${badge.border}`}>
                          <Text className={`font-pmedium text-[10px] uppercase tracking-wide ${badge.text}`}>
                            {badge.label}
                          </Text>
                        </View>
                      </View>

                      <Text className="font-pregular text-xs text-gray-500">
                        Requested: {formatDate(request.requestedAt || request.createdAt)}
                      </Text>
                      <Text className="font-pregular text-xs text-gray-500">
                        {status === "ACTIVE" ? "Approved" : "Updated"}:{" "}
                        {formatDate(request.respondedAt || request.grantedAt || request.updatedAt)}
                      </Text>

                      {request.responseReason ? (
                        <Text className="mt-1 font-pregular text-xs text-gray-600">
                          Reason: {request.responseReason}
                        </Text>
                      ) : null}

                      {status === "ACTIVE" ? (
                        <TouchableOpacity
                          onPress={() => handleRevoke(request)}
                          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
                        >
                          <Text className="text-center font-psemibold text-xs text-red-700">
                            Revoke Access
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={closeApprovalModal}
      >
        <View className="flex-1 justify-center bg-black/40 px-4">
          <View className="rounded-2xl bg-white p-4">
            <Text className="font-psemibold text-base text-gray-900">Approve Consent Request</Text>
            <Text className="mt-1 font-pregular text-xs text-gray-500">
              Choose exactly what this clinician can access.
            </Text>

            <View className="mt-3">
              <Text className="font-pmedium text-xs text-gray-700">Access level</Text>
              <View className="mt-2 flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setAccessLevel("READ_ONLY")}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    accessLevel === "READ_ONLY"
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-center font-pmedium text-xs text-gray-800">
                    Read-only
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAccessLevel("READ_WRITE")}
                  className={`flex-1 rounded-lg border px-3 py-2 ${
                    accessLevel === "READ_WRITE"
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <Text className="text-center font-pmedium text-xs text-gray-800">
                    Read + write
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="mt-3">
              <Text className="font-pmedium text-xs text-gray-700">Data domains</Text>
              <View className="mt-2" style={{ gap: 8 }}>
                {consentScopeDomainValues.map((domain) => {
                  const enabled = domains.includes(domain);
                  return (
                    <View
                      key={domain}
                      className="flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <Text className="font-pregular text-xs text-gray-700">
                        {domainLabels[domain]}
                      </Text>
                      <Switch
                        value={enabled}
                        onValueChange={(next) => toggleDomain(domain, next)}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
              <View className="pr-3">
                <Text className="font-pmedium text-xs text-gray-700">Include history</Text>
                <Text className="font-pregular text-[11px] text-gray-500">
                  Allow access to historical records in selected domains
                </Text>
              </View>
              <Switch value={includeHistory} onValueChange={setIncludeHistory} />
            </View>

            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity
                disabled={submitting}
                onPress={closeApprovalModal}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5"
              >
                <Text className="text-center font-pmedium text-xs text-gray-700">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={submitting}
                onPress={handleApprove}
                className="flex-1 rounded-lg bg-orange-500 px-3 py-2.5"
              >
                <Text className="text-center font-psemibold text-xs text-white">
                  {submitting ? "Approving..." : "Approve"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

