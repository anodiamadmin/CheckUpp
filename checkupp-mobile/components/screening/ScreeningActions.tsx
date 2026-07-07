import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";
import { scale, getFontSize, getSpacing } from "@/lib/utils/responsiveUtils";

type ScreeningActionsProps = {
  isUploading: boolean;
  handleSave: () => Promise<void>;
  handleClear: () => void;
  hasUnsavedChanges?: boolean;
  syncState?: "idle" | "syncing" | "synced" | "failed" | "offline-pending";
  lastSyncedAt?: string | null;
};

const ScreeningActions = ({
  isUploading,
  handleSave,
  handleClear,
  hasUnsavedChanges = false,
  syncState = "idle",
  lastSyncedAt = null,
}: ScreeningActionsProps) => {
  const getSaveButtonText = () => {
    if (isUploading) return "Syncing...";
    if (hasUnsavedChanges) return "Sync to Cloud";
    return "All Saved";
  };

  const getSyncStatusText = () => {
    if (syncState === "syncing") return "Syncing in progress...";
    if (syncState === "offline-pending")
      return "Offline: changes will sync when network returns.";
    if (syncState === "failed") return "Last sync failed. Tap Sync to retry.";

    if (lastSyncedAt) {
      const timestamp = new Date(lastSyncedAt);
      if (!Number.isNaN(timestamp.getTime())) {
        return `Last synced: ${timestamp.toLocaleString()}`;
      }
    }

    if (syncState === "synced") return "Cloud backup is up to date.";
    return "Data is saved locally on your device.";
  };

  return (
    <View
      className="bg-white rounded-xl shadow-sm"
      style={{
        padding: scale(16),
        marginBottom: getSpacing(8),
      }}
    >
      {/* Action Buttons */}
      <View className="flex-row" style={{ gap: scale(10) }}>
        <View className="flex-1">
          <UnifiedActionButton
            title={getSaveButtonText()}
            onPress={handleSave}
            variant="primary"
            icon="cloud-upload-outline"
            loading={isUploading}
            disabled={isUploading}
            fullWidth
            size="medium"
          />
        </View>
        <View style={{ width: scale(44) }}>
          <UnifiedActionButton
            title=""
            onPress={handleClear}
            variant="danger"
            icon="trash-outline"
            size="medium"
          />
        </View>
      </View>

      {/* Info Footer */}
      <View
        className="rounded-lg border"
        style={{
          marginTop: getSpacing(12),
          padding: scale(10),
          backgroundColor: "#F5F5F5",
          borderColor: "#e5e7eb",
        }}
      >
        <View className="flex-row items-start">
          <Ionicons
            name="information-circle-outline"
            size={scale(14)}
            color="#64748b"
            style={{ marginTop: scale(1) }}
          />
          <Text
            className="font-pregular flex-1"
            style={{
              fontSize: getFontSize(11),
              marginLeft: scale(8),
              lineHeight: getFontSize(15),
              color: "#475569",
            }}
          >
            Data is saved locally on your device. Sync to create a secure cloud
            backup.
          </Text>
        </View>
        <Text
          className="font-pregular"
          style={{
            fontSize: getFontSize(11),
            marginTop: getSpacing(8),
            color: "#334155",
          }}
        >
          {getSyncStatusText()}
        </Text>
      </View>
    </View>
  );
};

export default ScreeningActions;
