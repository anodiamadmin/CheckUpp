import React from "react";
import { View, TouchableOpacity, Text } from "react-native";

interface TabData {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface TabProps {
  tabData: TabData[];
  activeTab: string;
  setActiveTab: (tabValue: "Events" | "Reminders") => void;
}

const Tabs = ({ tabData, activeTab, setActiveTab }: TabProps) => {
  return (
    <View className="flex-row items-center rounded-full mb-4 mt-2">
      {tabData.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          onPress={() => setActiveTab(tab.value as "Events" | "Reminders")}
          className={`flex-row items-center px-4 mr-2 py-2 rounded-full ${
            activeTab === tab.value
              ? "bg-secondary border-secondary-200"
              : "bg-gray-100 border border-gray-200"
          }`}
        >
          {tab.icon && <View className="mr-2">{tab.icon}</View>}
          <Text
            className={`text-center text-base ${
              activeTab === tab.value
                ? "text-white font-psemibold"
                : "text-gray-700"
            }`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default Tabs;
