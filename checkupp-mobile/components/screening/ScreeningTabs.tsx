import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  scale,
  getFontSize,
  getSpacing,
} from "@/lib/utils/responsiveUtils";

type ScreeningTabsProps = {
  activeTab: "cancer" | "health";
  setActiveTab: (tab: "cancer" | "health") => void;
};

const ScreeningTabs = ({ activeTab, setActiveTab }: ScreeningTabsProps) => {
  const tabs = useMemo(
    () => [
      {
        id: "health",
        label: "Health Checks",
        icon: "heart-pulse",
      },
      {
        id: "cancer",
        label: "Cancer Screenings",
        icon: "radiology-box-outline",
      },
    ],
    []
  );

  return (
    <View
      className="bg-white rounded-xl overflow-hidden mt-2"
      style={{
        marginHorizontal: scale(12),
        marginBottom: getSpacing(8),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View
        className="flex-row"
        style={{
          padding: scale(3),
          gap: scale(3),
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <View key={tab.id} className="flex-1">
              <TouchableOpacity
                onPress={() => setActiveTab(tab.id as "cancer" | "health")}
                activeOpacity={0.8}
                style={{
                  shadowColor: isActive ? "#FF9C01" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.1 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <LinearGradient
                  colors={
                    isActive
                      ? (["#FFF7ED", "#FFFFFF"] as const)
                      : (["#F9FAFB", "#FFFFFF"] as const)
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className={`rounded-lg border ${
                    isActive ? "border-orange-200" : "border-gray-100"
                  }`}
                  style={{
                    paddingVertical: getSpacing(8),
                    paddingHorizontal: scale(6),
                  }}
                >
                  {/* Tab Content - Same height for all tabs */}
                  <View className="items-center justify-center">
                    <View className="flex-row items-center justify-center">
                      <View
                        className={`rounded-lg ${
                          isActive ? "bg-orange-50" : "bg-gray-50"
                        }`}
                        style={{
                          padding: scale(4),
                          marginRight: scale(6),
                        }}
                      >
                        <MaterialCommunityIcons
                          name={tab.icon as any}
                          size={scale(14)}
                          color={isActive ? "#FF9C01" : "#9CA3AF"}
                        />
                      </View>

                      <Text
                        className={`font-pmedium ${
                          isActive ? "text-secondary" : "text-gray-500"
                        }`}
                        style={{
                          fontSize: getFontSize(11),
                          textAlign: "center",
                          flex: 1,
                        }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {tab.label}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Active Indicator - Outside the tab container */}
              {/* <View
                className="items-center justify-center"
                style={{
                  height: getSpacing(6),
                  marginTop: scale(2),
                }}
              >
                {isActive && (
                  <View
                    className="bg-secondary rounded-full"
                    style={{
                      width: scale(16),
                      height: scale(2),
                    }}
                  />
                )}
              </View> */}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ScreeningTabs;
